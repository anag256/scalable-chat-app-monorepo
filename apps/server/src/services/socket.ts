import { Server, Socket } from "socket.io";
import  Redis  from "ioredis";
import prismaClient from "./prisma";
import { produceMessage } from "./kafka";

const pub=new Redis({
    host:'localhost',
    port:6379,
});
const sub=new Redis({
    host:'localhost',
    port:6379,
});

class SocketService {
  private _io: Server;
  constructor() {
    console.log("Init Socket Service...");
    this._io = new Server({
        cors:{
            allowedHeaders:["*"],
            origin:"*"
        }
    });
    sub.subscribe("MESSAGES");
  }

  public initListeners(){
    const io=this.io;
    console.log("Init socket listeners");
    io.on("connect", (socket) => {
        console.log(`New Socket Connected`, socket.id);
        socket.on("event:message", async ({ message }: { message: string }) => {
          console.log("New Message Rec.", message);
          // publish this message to redis
          await pub.publish("MESSAGES", JSON.stringify({ message }));
          await produceMessage(message);
        });
      });

      sub.on("message", async (channel, message) => {
        console.log("coming in");
        if (channel === "MESSAGES") {
          console.log("new message from redis", message);
          io.emit("message", message);
          // await prismaClient.message.create({
          //   data:{
          //     text:message
          //   }
          // })
          // await produceMessage(message);
          console.log('Message produced to kafka Broker')
        }
      });
  }
  get io() {
    return this._io;
  }
}

export default SocketService;