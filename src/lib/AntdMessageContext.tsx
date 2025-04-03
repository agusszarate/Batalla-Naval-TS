"use client";

import React, { createContext, useContext } from "react";
import { message } from "antd";
import type { MessageInstance } from "antd/es/message/interface";

// Create a context to hold the message API
const MessageContext = createContext<{
  messageApi: MessageInstance | null;
}>({
  messageApi: null,
});

// Provider component that makes message API available to all children
export const AntdMessageProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  // Get the message instance
  const [messageApi, contextHolder] = message.useMessage();

  return (
    <MessageContext.Provider value={{ messageApi }}>
      {/* This is where the message component will be rendered */}
      {contextHolder}
      {children}
    </MessageContext.Provider>
  );
};

// Hook to use the message API with proper context
export const useMessage = () => {
  const { messageApi } = useContext(MessageContext);

  if (!messageApi) {
    throw new Error("useMessage must be used within an AntdMessageProvider");
  }

  return messageApi;
};
