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
          <div>
            Press 'Connect' to start connecting with people.
          </div>
          <div>
            Press 'Stop' to disconnect during a call.
          </div>
          <div>
            <b>Note:</b> when you mute your video/screen, it may look like your video tile may look forzen,that is completly normal and your video/screen is not streamed until you unmute the video/screen.
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button onClick={props.onHide}>Close</Button>
        </Modal.Footer>
      </Modal>
    );
}