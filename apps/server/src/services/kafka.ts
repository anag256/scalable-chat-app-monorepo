import {Kafka, Producer} from 'kafkajs';
import prismaClient from './prisma';

const kafka=new Kafka({
    clientId:'my-app',
    brokers:["192.168.0.146:9092"]
})
async function init() {
    const admin=kafka.admin();
    await admin.connect();
    console.log("Admin connection success");
    console.log("creating topics")
   await  admin.createTopics({
    topics:[{
        topic:'MESSAGES',
        numPartitions:2,

    }]
   })
   console.log(" topics created successfully")
   console.log(" disconnecting admin")
   await admin.disconnect();

}
init();
let producer: null |  Producer=null;
export async function createProducer(){
    if(producer) return producer;
    const _producer=kafka.producer();
    await _producer.connect();
    producer=_producer;
    return producer;
}



export async function produceMessage(message:string){
 const producer=await createProducer();
 await producer.send({
    messages:[{key:`message-${Date.now()}`,value:message}],
    topic:"MESSAGES"
 })
 return true;
}

export async function startMessageConsumer() {
    console.log("consumer is running");
    const consumer=kafka.consumer({groupId:"default"});
    await consumer.connect();
    await consumer.subscribe({topic:"MESSAGES",fromBeginning:true});
    await consumer.run({
        autoCommit:true,
        eachMessage:async({message,pause})=>{
            if(!message.value) return;
            console.log("New message received");
            try {
                await prismaClient.message.create({
                    data:{
                        text:message.value?.toString()

                    }
                })
            } catch (error) {
                console.log("someting is wrong");
                pause();
                setTimeout(()=>{
                    consumer.resume([{topic:"MESSAGES"}])
                },60*1000)
            }
        }
        })
    }

export default kafka;