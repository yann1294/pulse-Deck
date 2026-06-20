"use client";

import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io, type Socket } from "socket.io-client";
import type {
  AiSuggestionStatus,
  TicketAiStatus,
  TicketCategory,
  TicketPriority
} from "@pulsedesk/shared";

const TICKET_UPDATED_EVENT = "ticket.updated";
const TICKET_AI_SUGGESTION_READY_EVENT = "ticket.aiSuggestionReady";
const POLLING_FALLBACK_INTERVAL_MS = 15_000;

type RealtimeStatus = "connecting" | "connected" | "fallback";

interface TicketUpdatedEvent {
  ticketId: string;
  payload?: {
    aiStatus?: TicketAiStatus;
    category?: TicketCategory;
    priority?: TicketPriority;
    latestAiSuggestion?: {
      id?: string;
      status?: AiSuggestionStatus;
      createdAt?: string;
    };
    updatedAt?: string;
  };
}

interface AiSuggestionReadyEvent {
  ticketId: string;
}

interface RealtimeNotice {
  id: number;
  message: string;
  tone: "emerald" | "teal" | "amber";
}

interface TicketRealtimeState {
  isLive: boolean;
  notice: RealtimeNotice | null;
  pollingFallbackInterval: number | false;
  status: RealtimeStatus;
}

let realtimeSocket: Socket | null = null;

function getRealtimeSocket(): Socket {
  if (!realtimeSocket) {
    realtimeSocket = io(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000", {
      autoConnect: false,
      transports: ["websocket", "polling"],
      withCredentials: true
    });
  }

  return realtimeSocket;
}

export function useTicketRealtime(currentTicketId?: string): TicketRealtimeState {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<RealtimeStatus>("connecting");
  const [notice, setNotice] = useState<RealtimeNotice | null>(null);

  useEffect(() => {
    const socket = getRealtimeSocket();

    function invalidateTicketQueries(ticketId: string): void {
      void queryClient.invalidateQueries({ queryKey: ["tickets"] });

      if (currentTicketId === ticketId) {
        void queryClient.invalidateQueries({ queryKey: ["ticket", ticketId] });
      }
    }

    function showNotice(nextNotice: Omit<RealtimeNotice, "id">): void {
      setNotice({
        ...nextNotice,
        id: Date.now()
      });
    }

    function handleConnect(): void {
      setStatus("connected");
    }

    function handleFallback(): void {
      setStatus("fallback");
    }

    function handleTicketUpdated(event: TicketUpdatedEvent): void {
      invalidateTicketQueries(event.ticketId);

      if (event.payload?.aiStatus === "FAILED") {
        showNotice({
          message:
            currentTicketId === event.ticketId
              ? "AI suggestion failed. Ticket refreshed."
              : "An AI suggestion failed. Queue refreshed.",
          tone: "amber"
        });
      }
    }

    function handleAiSuggestionReady(event: AiSuggestionReadyEvent): void {
      invalidateTicketQueries(event.ticketId);
      showNotice({
        message:
          currentTicketId === event.ticketId
            ? "AI suggestion ready. Ticket refreshed."
            : "AI suggestion ready. Queue refreshed.",
        tone: currentTicketId === event.ticketId ? "emerald" : "teal"
      });
    }

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleFallback);
    socket.on("connect_error", handleFallback);
    socket.on(TICKET_UPDATED_EVENT, handleTicketUpdated);
    socket.on(TICKET_AI_SUGGESTION_READY_EVENT, handleAiSuggestionReady);

    if (socket.connected) {
      window.setTimeout(handleConnect, 0);
    } else if (!socket.active) {
      socket.connect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleFallback);
      socket.off("connect_error", handleFallback);
      socket.off(TICKET_UPDATED_EVENT, handleTicketUpdated);
      socket.off(TICKET_AI_SUGGESTION_READY_EVENT, handleAiSuggestionReady);
    };
  }, [currentTicketId, queryClient]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => setNotice(null), 5_000);

    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  return {
    isLive: status === "connected",
    notice,
    pollingFallbackInterval: status === "connected" ? false : POLLING_FALLBACK_INTERVAL_MS,
    status
  };
}
