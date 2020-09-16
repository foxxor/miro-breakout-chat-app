import socketioControllerFactory from "./controllers/socketIoController";
import Chat from "./components/Chat/Chat.svelte";
import Error from "./components/Error.svelte";
import type { User } from "./interfaces/chat";

import { CLIENT_ID } from "../config";

const initApp = (boardId: string, roomId: string, user: User) => {
  const app = new Chat({
    target: document.body,
    props: {
      boardId,
      roomId,
      user,
      chatFactory: socketioControllerFactory,
    },
  });
};

const getCurrentUser = async (): Promise<User> => {
  const id = await miro.currentUser.getId();
  // @ts-ignore
  const onlineUsers = await miro.board.getOnlineUsers();

  const miroUser = onlineUsers.find((user) => user.id === id);
  const userToken = await miro.getToken();

  return {
    id: miroUser.id,
    name: miroUser.name,
    token: userToken,
  };
};

const getCurrentBoard = async () => {
  return await miro.board.info.get();
};

miro.onReady(async () => {
  const savedState = await miro.__getRuntimeState();
  const user = await getCurrentUser();
  const board = await getCurrentBoard();

  if (savedState[CLIENT_ID]?.breakoutChatRoomId && user) {
    // @ts-ignore
    initApp(board.id, savedState[CLIENT_ID]?.breakoutChatRoomId, user);
  } else {
    const app = new Error({
      target: document.body,
    });
  }
});
