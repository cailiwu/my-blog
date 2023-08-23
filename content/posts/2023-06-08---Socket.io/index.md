---
title: 用Socket.io實現即時通訊
date: "2023-06-08T22:40:32.169Z"
template: "post"
draft: false
slug: "/posts/2023-06-08---Socket.io"
category: "Backend"
tags:
  - "Websocket"
  - "Socket.io"
description: "在早些HTTP協議開發時，並不是為了雙向溝通而準備的，起初只要網站請求-回應這樣就好了，所以為擁有雙向溝通的網站，只能透過HTTP輪詢的方式達成，因此有了長輪詢 與短輪詢"
---


## 背景

在早些HTTP協議開發時，並不是為了雙向溝通而準備的，起初只要網站請求-回應這樣就好了，所以為擁有雙向溝通的網站，只能透過HTTP輪詢的方式達成，因此有了`長輪詢` 與`短輪詢`

**短輪詢：**透過Client端定期詢問Server是否有新的資料，輪詢間隔大了資料不夠即時正確，但間隔小的話，則會消耗過多的流量增加伺服器的負擔。

**長輪詢：**是對短輪詢的優化，需要Server做對應的修改來支持此事，Client端向Server端發送請求時，如果沒有新的資料產生，並不立刻回傳，而是Hold住一段時間等有新的資料或者超時再回傳。

但每一次請求包含較長的header，其中真正有效的資料可能只是很小的一部分，顯然會消耗過多的資源，因此，有了Websocket的出現，

**WebSocket**，是一種網絡傳輸協議，位於 OSI 模型的應用層，可在單個 TCP 連接上進行全雙工（兩個方向上同時傳輸）通訊，能更好的節省服務器資源和頻寬並達到即時通訊，**客戶端和服務器只需要完成一次握手，兩者之間就可以創建持久性的連接**，並進行雙向數據傳輸，與HTTP使用一樣port。WebSocket預設使用80 port，協議為`ws://`，TLS加密請求使用443 port，協議為`wss://`。

### **握手**

使用 HTTP 進行實現。由客戶端使用 http 的方式發起握手請求，服務端接請求後，將當前正在使用的連接（TCP）的協議，由 http 協議切換爲 websocket 協議。

Request

握手請求頭會帶有 `Upgrade` 參數用於升級協議類型

```jsx
GET / HTTP/1.1
Upgrade: websocket
Connection: Upgrade
Host: example.com
Origin: http://example.com
Sec-WebSocket-Key: sN9cRrP/n9NdMgdcy2VJFQ==
Sec-WebSocket-Version: 13
```

Response

`HTTP/1.1101 Switching Protocols`表示服務端接受 WebSocket 協議的客戶端連接

```jsx
HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: fFBooB7FAkLlXgRSz0BT3v4hq5s=
Sec-WebSocket-Location: ws://example.com/
```

### 數據傳輸

服務端接收握手請求後，回覆 response 消息，一旦這個握手回覆發送出去，服務端就認爲此 WebSocket 連接已經建立成功，處於 OPEN 狀態。它就可以開始發送數據了。WebSocket 中所有發送的數據使用`frame`的形式發送

![螢幕快照 2023-06-04 上午7.06.56.png](https://s3-us-west-2.amazonaws.com/secure.notion-static.com/751b6737-34b0-4bb2-aa3f-fd0bf79994b3/%E8%9E%A2%E5%B9%95%E5%BF%AB%E7%85%A7_2023-06-04_%E4%B8%8A%E5%8D%887.06.56.png)

- 建立在 TCP 協議之上，服務器端的實現比較容易。
- 可以發送文字，也可以發送二進位資料。
- 數據格式比較輕量，性能開銷小，通訊高效。
- 沒有同源限制，客戶端可以與任意服務器通訊。

## Socket.io 簡介

[Socket.IO](http://socket.io/) 創建於 2010 年。它的開發是為了使用開放連接來促進即時通訊，允許客戶端與伺服器進行雙向通訊，為了連接雙方並交換資料，有一個瀏覽器端的套件與伺服器端的套件，都是屬於事件驅動，其底層使用`Engine.io` 。Socket.io 基於使用Websocket協議，如果因為環境無法建立Websocket連接則會退回HTTP長輪詢。

### 應用場景

- 聊天室
- 共同編輯
- 即時更新系統
- 社交訂閱通知
- 多人玩家遊戲

特點**：**

- Socket.IO 通過命名空間支持多路復用。使用命名空間使能夠最大限度地減少使用的 TCP 連接數
- 服務器端靈活地向所有連接的客戶端廣播事件。還可以通過房間功能向部分客戶廣播事件。
- 提供HTTP 長輪詢作為後備選項，這在不支持 WebSockets 的環境中很有用
- 提供了一種可配置的 Ping/Pong 心跳機制，檢測連接是否存在。此外，如果客戶端斷開連接，它會自動重新連接
- Socket.IO 具有有限的本機安全功能。例如，它不提供端到端加密，也不提供生成和更新令牌以進行身份驗證的機制。
- Socket.IO 與任何其他 WebSocket 實現都不兼容。
- Socket.IO 不保證精確一次(exactly-once )消息語義。默認情況下，提供至多一次(At-most-once)保證。Socket.IO 也可以配置為提供至少一次(At-least-once)保證，這會帶來額外的工程複雜性——必須使用確認、超時、為每個事件分配唯一 ID 並將事件保存在資料庫中。

心跳機制設定時間

```jsx
const httpServer = require("http").createServer();
const io = require("socket.io")(httpServer, {
  pingInterval: 10000, // how often to ping/pong.
  pingTimeout: 30000 // time after which the connection is considered timed-out.
})
```

### Demo code 以 Node.js 為例

安裝相關套件

```bash
npm intall express socket.io
```

建立一個HTTP伺服器並整合socket.io

```jsx
const express = require("express");
const path = require("path");
const http = require("http");
const socket = require("socket.io");

const port = process.env.PORT || 3000;
const app = express();
const server = http.createServer(app);
app.use(express.static(path.join(__dirname, "public")));

// 整合socket.io
const io = new Server(server);

const onConnection = (socket) => {
  console.log("Socket.io connect success", socket.id);
};

io.on("connection", onConnection);

server.listen(port, () => {
  console.log("Server listening at port %d", port);
});

```

準備一個網頁並透過socket.io連接到Server

`main.js`

```jsx
const socket = io.connect();

socket.on("connect", () => {
  console.log("connect server success");
});
```

### **Emitting events**

網站傳送資料

```jsx
socket.emit("send-message", message);
```

Server 接收訊息

```jsx
io.on("connection", (socket) => {
  socket.on("send-message", (message) => {
    console.log(`receive: ${message}`)
  });
});
```

### Broadcasting

廣播給所有人

```jsx
io.on('connection', (socket) => {
  socket.broadcast.emit('hi');
});
```

### NameSpaces V.S. Rooms

它們兩個存在的原因都是為了`分組`，把要傳送的訊息，送到你想要的群組中。

namespace在服務器上創建，並從客戶端加入(`io.connect('/namespace')`)，在沒有指定namespace時，預設為`/` ，以非常具體的工作命名，像是`news`, `games` 等。

room是namespace的子通道。room純粹是服務器端的創建，像是在一個大主題下建立了很多不同小主題，每個 room 只屬於某個 namespace, 只能收聽同一個 namespace的消息。

![螢幕快照 2023-06-02 上午6.23.06.png](https://s3-us-west-2.amazonaws.com/secure.notion-static.com/0c8d3138-f2a9-4cd0-9906-efd7d206a9f8/%E8%9E%A2%E5%B9%95%E5%BF%AB%E7%85%A7_2023-06-02_%E4%B8%8A%E5%8D%886.23.06.png)

### Namespaces

client連接至`users`的空間

```jsx
const userSocket = io.connect("/users"});
```

Server 創立一個`users` 的io

```jsx
const userIo = io.of("/users");

userIo.on("connection", (socket) => {
  console.log("connected to user namespace");
});
```

### Rooms

加入房間(Server-side)

```jsx
socket.on("join-room", (room, cb = () => {}) => {
    // 加入同一空間的房間
    console.log("room", room);
    socket.join(room);
    // call back messages
    cb(`Joined ${room}`);
});
```

如果從Client端帶房號進來，就發送訊息至此房間

```jsx
const onConnection = (socket) => {
  socket.on("send-message", (message, room) => {
    // 廣播給在同一空間的所有人
    if (room === "") {
      socket.broadcast.emit("receive-message", message);
    } else {
      // 發送訊息給對應的房間
      socket.to(room).emit("receive-message", message);
    }
  });
```

### Middleware

- logging
- authentication / authorization
- rate limiting

**Sending credentials**

```jsx
const userSocket = io.connect("/users", {
  auth: {
    token: "xxxxx",
  },
});
```

```jsx
userIo.use((socket, next) => {
  if (isValidToken(socket.handshake.auth.token)) {
    console.log("token is valid");
    next();
  } else {
    next(new Error("Please send correct token."));
  }
});
```

**Client side Receive errors** 

```jsx

socket.on("connect_error", (err) => {
  console.log(err.message);
});
```

---

### 參考資料

[官網](https://socket.io/)

[Introduction | Socket.IO](https://socket.io/docs/v4/)

https://github.com/socketio/engine.io

https://www.youtube.com/watch?v=ZKEqqIO7n-k&ab_channel=WebDevSimplified

[Delivery guarantees | Socket.IO](https://socket.io/docs/v4/delivery-guarantees)

[谈谈流计算中的『Exactly Once』特性 - 掘金](https://juejin.cn/post/6844903857558913038)

[Socket.io 的說話島 | 拿鐵派的馬克 Blog](https://mark-lin.com/posts/20170914/)

[WebSocket 是什麼？爲什麼能持久連接？](https://www.readfog.com/a/1649297763805007872)

[Nodejs+webSocket搭建多人聊天室_node.js多人聊天室_@听风者的博客-CSDN博客](https://blog.csdn.net/u011723584/article/details/89301012)

[基于node+socket.io+redis的多房间多进程聊天室-腾讯云开发者社区-腾讯云](https://cloud.tencent.com/developer/article/1548103)

[WebSocket和Socket.io之间的区别(译)](https://zhuanlan.zhihu.com/p/346650330)

[【筆記】Socket，Websocket，Socket.io的差異](https://leesonhsu.blogspot.com/2018/07/socketwebsocketsocketio.html)

[Creating a Real Time Chat App using React and Socket IO with E2E Encryption | Engineering Education (EngEd) Program | Section](https://www.section.io/engineering-education/creating-a-real-time-chat-app-with-react-socket-io-with-e2e-encryption/)

[Node.js Socket.io Namespaces, Rooms and Connections 02](https://medium.com/@ipenywis/node-js-socket-io-namespaces-rooms-and-connections-02-14e84dbdba46)

---

[Websocket v.s. Socket.io](https://ably.com/topic/socketio-vs-websocket)