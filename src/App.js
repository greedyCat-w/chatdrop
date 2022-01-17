import { Button, Form, Spinner, Stack } from 'react-bootstrap';
import io from 'socket.io-client'
import videopng from './img/video.png'
import audiopng from './img/microphone.png'
import screenpng from './img/screen.png'
import novideopng from './img/no-video.png'
import noaudiopng from './img/mute.png'
import { useEffect, useRef, useState } from 'react';
import StatusButton from './StatusButton';
import MyModal from './MyModal';


const videoConstraints = {width: 300,height:210}

function App() {

  const socketRef = useRef()
  const roomRef = useRef()
  const otherUserRef = useRef()
  const ownerRef = useRef(false)
  const peerRef = useRef()
  const connecTimerRef = useRef()
  const [connected,setConnected]= useState(false)
  const [stopped,setStopped] = useState(true)
  const dataChannelRef = useRef()
  const mediaSenderRef = useRef()
  const screenTrackRef = useRef()
  const makingOfferRef = useRef(false)
  const ignoreOfferRef = useRef(false)
  const isSettingRemoteAnswerPendingRef = useRef(false)
  const messagesBottom = useRef()
  const [messages,setMessages] = useState([])
  const [alone,setAlone] = useState(true)
  const myStream = useRef()
  const partnerStream = useRef()
  const [video,setVideo] = useState(false)
  const [audio,setAudio] = useState(false)
  const [screen,setScreen] = useState(false)
  const [partnerScreen,setPartnerScreen] = useState(false)
  const myVideo = useRef()
  const partnerVideo = useRef()
  const videoButton = useRef()
  const audioButton = useRef()
  const screenButton = useRef()
  const messageRef = useRef()
  const [modalShow,setModalShow] = useState(true)

  function connect(){
      const socket = io.connect('/')
      socketRef.current = socket;
      socket.on('wait',(data)=>console.log(data))
      socket.on('ack',(data)=>{
        console.log(data)
        socket.emit('join','join a room')
        socket.on('private ack',(ack)=>{
          roomRef.current = ack.roomId
        })
      })
      
      socket.on('other-user',(userData)=>{
        otherUserRef.current = userData.otherUser
        if(userData.owner){
          ownerRef.current = userData.owner
          callOtherUser()
        }
      })

      socket.on('alone',()=>{
        handleDisconnect()
        setAlone(true)
        connect()
      })
      
      socket.on('offer',handleOffer)
      socket.on('answer',handleAnswer)
      socket.on('icecandidate',handleNewIceCandidate)
      peerRef.current = createPeer()

  }

  function handleDisconnect(){
    console.log('handle disconnect is called')
      socketRef.current.disconnect()
      ownerRef.current = false
      if(peerRef.current) peerRef.current.close()
      peerRef.current = undefined
      makingOfferRef.current = false
      isSettingRemoteAnswerPendingRef.current = false
      ignoreOfferRef.current = false
      otherUserRef.current = false
      roomRef.current = false
      dataChannelRef.current = undefined
      partnerStream.current = undefined
      partnerVideo.current.srcObject = undefined
      mediaSenderRef.current = undefined
      setMessages(()=>[])
      if(screen){
        screenToggle()
      }
  }

  function callOtherUser(){
    peerRef.current = createPeer()
    dataChannelRef.current = peerRef.current.createDataChannel('msgChannel')
    dataChannelRef.current.onmessage = handleRecieveMessage
    dataChannelRef.current.onopen = handleOnDataChannelOpen
    dataChannelRef.current.onclose = handleOnDataChannelClose
    setMediaTrackForPeer()
  }

  function createPeer(){
    const peer = new RTCPeerConnection({
      iceServers:[
        {
          url:'stun:stun.stunprotocol.org'
        },
        {
          url: 'turn:numb.viagenie.ca',
          credential: 'muazkh',
          username: 'webrtc@live.com'
      },
      {
          url: 'turn:192.158.29.39:3478?transport=udp',
          credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
          username: '28224511:1379330808'
      }
      ]
    })
    peer.onicecandidate = handleonIceCandidate
    peer.ontrack = handleTrackEvent
    peer.onnegotiationneeded = handleNegotiationNeededEvent
    return peer
  }
  
  async function handleNegotiationNeededEvent(){
    try{
      makingOfferRef.current = true;
      const offer = await peerRef.current.createOffer()
      await peerRef.current.setLocalDescription(offer)
      const payload = {
          target: otherUserRef.current,
          caller: socketRef.current.id,
          sdp: peerRef.current.localDescription
      }
      socketRef.current.emit('offer',payload)
    }catch(e){
      console.log(e)
    }finally{
      makingOfferRef.current = false;
    }
  }

  function setMediaTrackForPeer(){
    try{
      myStream.current.getTracks().forEach(track=>{
        if(track.kind==='video') mediaSenderRef.current = peerRef.current.addTrack(track,myStream.current)
        peerRef.current.addTrack(track,myStream.current)
      })
    }catch(e){

    }
  }

  async function handleOffer(offer){
    const readyForOffer =
          !makingOfferRef.current &&
          (peerRef.current.signalingState == "stable" || isSettingRemoteAnswerPendingRef.current);
    ignoreOfferRef.current = !ownerRef.current && !readyForOffer;
      if (ignoreOfferRef.current) {
        return;
    }
    const desc = new RTCSessionDescription(offer.sdp)
    try{
      await peerRef.current.setRemoteDescription(desc)
      const answer = await peerRef.current.createAnswer()
      await peerRef.current.setLocalDescription(answer)
      setMediaTrackForPeer()
      const payload = {
        target: otherUserRef.current,
        sdp: peerRef.current.localDescription
      }
      console.log('sending answer')
      socketRef.current.emit('answer',payload,({ok})=>{
        console.log(dataChannelRef.current && dataChannelRef.current.readyState)
        if(!dataChannelRef.current || !dataChannelRef.current.readyState==='open'){
          if(ok) {
            console.log('setting up timer 1')
            connecTimerRef.current = setTimeout(()=>{
              console.log(dataChannelRef)
              handleDisconnect()
              connect()
              console.log('attempting reconnect')
            },80000)
          }else{
            handleDisconnect()
            connect()
          }
        }
      })
    }catch(e){
      console.log(e)
    }
    peerRef.current.ondatachannel = (event)=>{
      console.log('data channel created')
      dataChannelRef.current = event.channel
      dataChannelRef.current.onmessage = handleRecieveMessage
      dataChannelRef.current.onopen = handleOnDataChannelOpen
      dataChannelRef.current.onclose = handleOnDataChannelClose
    }
  }

  async function handleAnswer(answer){
    console.log('answer recieved')
    const desc = new RTCSessionDescription(answer.sdp)
    if(!isSettingRemoteAnswerPendingRef.current){
      try{
          isSettingRemoteAnswerPendingRef.current = true
          await peerRef.current.setRemoteDescription(desc)
          console.log('answer set')
      }catch(e){
        console.log(e)
      }finally{
        isSettingRemoteAnswerPendingRef.current = false
      }
    }
  }

  function handleonIceCandidate(event){
    if(event.candidate){
      const payload = {
        target: otherUserRef.current,
        iceCandidate: event.candidate
      }
      socketRef.current.emit('ice-candidate',payload)
    }
  }

  async function handleNewIceCandidate(iceCandidate){
    const candidate = new RTCIceCandidate(iceCandidate)
    try{
     await peerRef.current.addIceCandidate(candidate)
    }catch(err){
      if(!ignoreOfferRef.current) console.log(err)
    }
  }

  function handleTrackEvent({track,streams}){
    console.log('ok track event called ')
    if(!partnerStream.current){
      console.log('setting partner video')
      console.log(streams)
      partnerStream.current = streams[0]
    }
  }

  function handleOnDataChannelOpen(){
    console.log('data channel open')
    setAlone(false)
    clearTimeout(connecTimerRef.current)
    setConnected(true)
    partnerVideo.current.srcObject = partnerStream.current
  }

  function handleOnDataChannelClose(){
    setConnected(false)
    console.log('data channel close')
  }

  async function videoToggle(){
    console.log('trying to toggle video....!')

    if(video){
      console.log('in video true')
      const videoTrack = myStream.current.getVideoTracks()[0]
      videoTrack.enabled = false
      myStream.current.removeTrack(videoTrack)
      videoTrack.stop()
      setVideo(!video)
    }else{
      const stream = await navigator.mediaDevices.getUserMedia({video:videoConstraints})
      myStream.current.addTrack(stream.getVideoTracks()[0],stream)
      if(mediaSenderRef.current){
        mediaSenderRef.current.replaceTrack(stream.getVideoTracks()[0])
      }else{
        if(peerRef.current)
        mediaSenderRef.current = peerRef.current.addTrack(stream.getVideoTracks()[0],myStream.current)
      }
      setVideo(video=>!video)
    }
  }

  function audioToggle(){
    console.log('trying to toggle audio....!')
    if(audio){
      myStream.current.getAudioTracks()[0].enabled = false
    }else{
      myStream.current.getAudioTracks()[0].enabled = true
    }
    setAudio(audio=>!audio)
  }

  async function screenToggle(){
    console.log('trying to toggle screen....!')
    if(!screen){
        const stream = await navigator.mediaDevices.getDisplayMedia({cursor: true})
        screenTrackRef.current = stream.getTracks()[0]
        console.log(stream.getTracks()[0])
        if(mediaSenderRef.current){
          mediaSenderRef.current.replaceTrack(screenTrackRef.current)
        }else{
          if(peerRef.current)
          mediaSenderRef.current = peerRef.current.addTrack(screenTrackRef.current,myStream.current)
        }
        screenTrackRef.current.onended = onScreenShareEnded
        if(video){
          videoToggle()
        }
        myStream.current.addTrack(screenTrackRef.current)
    }else{
        screenTrackRef.current.stop()
        myStream.current.removeTrack(screenTrackRef.current)
    }
    setScreen(screen=>!screen)
    if(connected)
      dataChannelRef.current.send('&(*&(&^')
  }

  async function onScreenShareEnded(){
    screenTrackRef.current.stop()
    if(connected){
      dataChannelRef.current.send('&(*&(&^')
    }
    myStream.current.removeTrack(screenTrackRef.current)
    setScreen(false)
  }

  useEffect(()=>{
    navigator.mediaDevices.getUserMedia({video:videoConstraints,audio:true}).then((stream)=>{
      myVideo.current.srcObject = stream
      console.log(myVideo.current.srcObject)
      myStream.current = stream
      setVideo(true)
      setAudio(true)
    })
    return ()=>{
      myStream.current.getTracks().forEach(track=>track.stop())
      socketRef.current.disconnect()
    }
  },[])

  useEffect(()=>{
    messagesBottom.current.scrollIntoView('smooth')
  },[messages])

  return (
    <div className="app">
      <MyModal
        show={modalShow}
        onHide={() => setModalShow(false)}
      />
      <div className="header">
          Chat Drop <p style={{float: 'right'}}>made with webRTC :)</p>
      </div>
      <div className='content-small'>
        <video autoPlaycontrols={partnerScreen?true:false} ref={partnerVideo} />
      </div>
      <div className='content-small'>
        <video autoPlay muted ref={myVideo}/>
      </div>
      <div className='message-window' >
        {messages.map(({message,me},index)=>{
          return <div className='message'  key={index}>
                      <div className={`bubble ${me?'me':'other'}`}>{message}</div>
                 </div>})}
        <div ref={messagesBottom}></div>
      </div>
      <div className='media-controls'>
        <Button variant='outline-light' src={video?videopng:novideopng} disabled={connected} as='img' onClick={videoToggle} ref={videoButton}/>
        <Button variant='outline-light' src={audio?audiopng:noaudiopng} disabled={connected} as='img' onClick={audioToggle} ref={audioButton}/>
        <Button variant='outline-light' src={screenpng} disabled={connected} as='img' onClick={screenToggle} ref={screenButton}/>
      </div>
      <form className='message-controls' onSubmit={handleSend}>
            <StatusButton stopped={stopped} alone={alone} handler={handleConnectAndStop}/>
            <Form.Control placeholder="type your message here..." autoFocus ref={messageRef} disabled={!connected}/>
            <Button type='submit' variant="secondary" disabled={!connected} >Send</Button>
      </form>
    </div>
  );
  

  function handleRecieveMessage(event){

    if(event.data === '&(*&(&^') {
      return setPartnerScreen((partnerScreen)=>!partnerScreen)
    }
    const message = {
      message: event.data,
      me: false
    }
    setMessages((messages)=>[...messages,message])
  }

  function handleSend(e){
    e.preventDefault()
    console.log(messageRef.current.value)
    const message = {
      message: messageRef.current.value,
      me: true
    }
    messageRef.current.value = ''
    messageRef.current.focus()
    dataChannelRef.current.send(message.message)
    setMessages((messages)=>[...messages,message])

  }

  function handleConnectAndStop(){
    console.log(stopped,alone)
    if(stopped)
    {
      setStopped(false)
      setAlone(true)
      connect()
    }
    else if(!alone){
      handleDisconnect()
      setStopped(true)
      setAlone(true)
    }
    else if(!stopped&&alone){
      setStopped(true)
      setAlone(false)
      handleDisconnect()
    }
  }
}

export default App;
