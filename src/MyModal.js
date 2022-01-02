import { Button,Modal } from "react-bootstrap";

export default function MyModal(props) {
    return (
      <Modal  
        {...props}
        size="lg"
        aria-labelledby="contained-modal-title-vcenter"
        centered
      >
        <Modal.Header closeButton>
        </Modal.Header>
        <Modal.Body>
          <ul>
            <li>
                Hi, This app uses webRTC. which enables peer to peer based communication without any server except for signalling.
            </li>
            <li>
              Press 'Connect' to start connecting with people.
            </li>
            <li>
              Press 'Stop' to disconnect during a call.
            </li>
            <li>
              <b>Note:</b> when you mute your video/screen, it may look like your video tile may look frozen,that is completly normal and your video/screen is not streamed until you unmute the video/screen.
            </li>
            <li>
            disable your vpn as finding peers can be difficult.also if you're behind a symmetric NAT :) things will be pretty hard i say.
            </li>
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={props.onHide}>Close</Button>
        </Modal.Footer>
      </Modal>
    );
}