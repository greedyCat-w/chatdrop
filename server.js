const path = require('path')
const { v4 : uuid} = require('uuid') 
const express = require('express')
const http = require('http')
const { resolve } = require('path')
const app = express()
const server = http.createServer(app)
const socket = require('socket.io')
const io = socket(server)
require('./globals.js')

io.on('connection',socket => {

    socket.emit('wait',{'message': 'Please wait...connecting you to a stranger!'});
    availableUsers.push(socket);
    let resolveAfter5Seconds = () => {
        setTimeout(()=>{
            resolve('resolved')
        },5000)
    }

    async function asyncCall(){
        let result = await resolveAfter5Seconds();
        let selected = Math.floor(Math.random()*availableUsers.length);
        socket = availableUsers[selected]
        availableUsers.splice(selected,1)

        socket.emit('ack','finding a user for you')
        onlineUsers.push(socket)
        socket.on('join',()=>{
            let unfilledRooms = rooms.filter((room)=>{
                if(!room.isFilled){
                    return room
                }
            })
            console.log(unfilledRooms)
            try{
                socket.join(unfilledRooms[0].roomId)
                let index = rooms.indexOf(unfilledRooms[0])
                rooms[index].isFilled = true
                unfilledRooms[0].isFilled = true
                socket.emit('private ack',{roomId: unfilledRooms[0].roomId})
                socket.roomId = unfilledRooms[0].roomId
                rooms[index].users.push(socket.id)
                console.log('sending other user')
                io.to(socket.id).emit('other-user',{otherUser:rooms[index].users[0],owner: false})
                io.to(rooms[index].users[0]).emit('other-user',{otherUser:socket.id,owner: true})
            }
            catch(e){
                console.log(e)
                let uID = uuid()
                rooms.push({roomId: uID,isFilled: false,users: [socket.id]})
                socket.join(uID)
                socket.roomId = uID;
                socket.emit('private ack',{'message': 'Added to privateRoom','roomId': uID})
            }
        })

        // socket.on('join room',roomId =>{
            
        //     const otherUser = rooms.find(room=>room.roomId==roomId).users.find(id => id !== socket.id);
        //     if(otherUser){
        //         socket.emit('other user',otherUser)
        //         socket.to(otherUser).emit('user joined',socket.id)
        //     }
        // })
    }
    asyncCall()

    socket.on('disconnect',()=>{
        console.log('disconnecting...')
        let index = onlineUsers.indexOf(socket)
        console.log(index)
        onlineUsers.splice(index,1)
        console.log(socket.roomId)
        console.log(rooms)
        index = rooms.findIndex(x=>x.roomId == socket.roomId)
        if(socket.roomId && index >= 0 && rooms[index].isFilled){
            if(rooms[index].isFilled == true){
                let warning = {'title': 'stranger is disconnected!','message':'Please click on New button to connect to someone else.'}
                console.log(`disconnected ${socket.roomId}`)
                io.to(socket.roomId).emit('alone',{'warning': warning,'roomID': socket.roomId})
                rooms.splice(index,1)
            }
        }else{
            console.log(`here ${index}`)
            if(index>=0) rooms.splice(index)
            console.log(rooms)
        }
    })

    socket.on('offer',payload=>{
        io.to(payload.target).emit('offer',payload)
    })

    socket.on('answer',(payload,callback)=>{
        callback({ok:true})
        socket.to(payload.target).emit('answer',payload)
    })

    socket.on('ice-candidate',incoming => {
        io.to(incoming.target).emit('ice-candidate',incoming.candidate)
    })
})

const port = process.env.PORT || 8080

app.get('/health',(req,res)=>{
    res.send('check :)')
})

app.use(express.static(path.join(__dirname,'./build')));
app.get('*',(req,res)=>{
    res.sendFile(path.join(__dirname,'./build/index.html'))
})

server.listen(port,console.log(`server is up and listening on port ${port}.`))