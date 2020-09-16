require("dotenv").config();
var express = require("express");
var app = express();
var cors = require("cors");
var http = require("http").Server(app);
var socketConfig = require("./config");
var io = require("socket.io")(http, socketConfig);
var port = process.env.PORT || 8081;
const MIRO_ACCESS_TOKEN = process.env.MIRO_ACCESS_TOKEN;
const MiroApi = require("./services/miroApi");

const miroApi = new MiroApi(MIRO_ACCESS_TOKEN);
var rooms = {};
var roomsCreatedAt = new WeakMap();
var names = new WeakMap();
let boardId;
let roomId;
let name;
let user;

app.use(cors());

app.get("/rooms/:roomId", (req, res) => {
  const { roomId } = req.params;
  const room = rooms[roomId];

  if (room) {
    res.json({
      createdAt: roomsCreatedAt.get(room),
      users: Object.values(room).map((socket) => names.get(socket)),
    });
  } else {
    res.status(500).end();
  }
});

app.get("/rooms", (req, res) => {
  res.json(Object.keys(rooms));
});

io.on("connection", (socket) => {
  socket.on("join", async (_boardId, _roomId, _user, callback) => {
    if (!_boardId || !_roomId || !_user) {
      if (callback) {
        callback("boardId, roomId and user params required");
      }
      console.warn(
        `${socket.id} attempting to connect without boardId, roomId or user`,
        { boardId: _boardId, roomId: _roomId, user: _user }
      );
      return;
    }

    if (!validateBoardUserAccess(_boardId, _user.id)) {
      callback("The provided user has no permissions to call this API.");
      return;
    }

    boardId = _boardId;
    roomId = _roomId;
    name = _user.name;

    if (rooms[roomId]) {
      rooms[roomId][socket.id] = socket;
    } else {
      rooms[roomId] = { [socket.id]: socket };
      roomsCreatedAt.set(rooms[roomId], new Date());
    }
    socket.join(roomId);

    names.set(socket, name);

    io.to(roomId).emit("system message", `${name} joined ${roomId}`);

    if (callback) {
      callback(null, { success: true });
    }
  });

  socket.on("chat message", (msg) => {
    io.to(roomId).emit("chat message", msg, name);
  });

  socket.on("disconnect", () => {
    io.to(roomId).emit("system message", `${name} left ${roomId}`);

    if (roomId in rooms) {
      delete rooms[roomId][socket.id];
      if (!Object.keys(rooms[roomId]).length) {
        delete rooms[roomId];
      }
    }
  });
});

http.listen(port, "0.0.0.0", () => {
  console.log("listening on *:" + port);
});

/**
 * Validates if the User with the specified User ID has access to the Board with the specificed Board ID
 * @async
 * @param {String} boardId
 * @param {String} userId
 * @return {Boolean}
 */
async function validateBoardUserAccess(boardId, userId) {
  const boardTeamMembers = await miroApi.getBoardTeamMembers(boardId);
  const userConnection = boardTeamMembers.find(
    (userConnection) => userConnection.user.id == userId
  );

  return !!userConnection;
}
