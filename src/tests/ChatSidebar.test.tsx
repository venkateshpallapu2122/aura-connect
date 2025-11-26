import { render, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import ChatSidebar from "../components/chat/ChatSidebar";
import { supabase } from "../integrations/supabase/client";
import { MemoryRouter } from "react-router-dom";

// Mock dependencies
vi.mock("../integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn(),
    channel: vi.fn(() => ({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn(),
    })),
    removeChannel: vi.fn(),
    auth: {
      signOut: vi.fn(),
    },
  },
}));

const toast = vi.fn();
vi.mock("../hooks/use-toast", () => ({
  useToast: () => ({
    toast: toast,
  }),
}));

const renderWithRouter = (ui: React.ReactElement) => {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
};

describe("ChatSidebar", () => {
  it("should show an error toast when trying to create a conversation with a non-existent user", async () => {
    // Arrange
    const userId = "test-user-id";
    const onSelectConversation = vi.fn();

    const fromMock = vi.fn((table: string) => {
      if (table === "profiles") {
        const profilesMock = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          neq: vi.fn().mockReturnThis(),
          single: vi.fn(),
        };

        profilesMock.select.mockReturnValue(profilesMock);
        profilesMock.neq.mockReturnValue(profilesMock);
        profilesMock.eq.mockImplementation((column, value) => {
          if (column === "id" && value === "non_existent_user_id") {
            profilesMock.single.mockResolvedValue({ data: null, error: { message: "User not found" } });
          } else {
            profilesMock.single.mockResolvedValue({ data: { id: "test-user-id", username: "test-user" }, error: null });
          }
          return profilesMock;
        });

        // Mock the user list
        (supabase.from as vi.Mock).mockImplementation((tableName: string) => {
          if (tableName === "profiles") {
            return {
              ...profilesMock,
              select: vi.fn().mockReturnValue({
                neq: vi.fn().mockResolvedValue({ data: [{ id: "non_existent_user_id", username: "non_existent_user" }], error: null }),
              }),
            };
          }
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            neq: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            order: vi.fn().mockReturnThis(),
            insert: vi.fn().mockResolvedValue({ data: [{}], error: null }),
          };
        });

        return profilesMock;
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        neq: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        insert: vi.fn().mockResolvedValue({ data: [{}], error: null }),
      };
    });
    (supabase.from as vi.Mock).mockImplementation(fromMock);

    const { getByText } = renderWithRouter(
      <ChatSidebar userId={userId} selectedConversationId={null} onSelectConversation={onSelectConversation} />
    );

    // Act
    fireEvent.click(getByText("New Chat"));
    await waitFor(() => getByText("Start a new chat"));
    fireEvent.click(getByText("non_existent_user"));


    // Assert
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith({
        title: "Error",
        description: "This user no longer exists.",
        variant: "destructive",
      });
    });
  });
});
