import React from 'react'
import { Button, Spinner } from 'react-bootstrap'

export default function StatusButton(props) {

    function getStatusButtonVariant(props){
        if(props.stopped){
          return 'info'
        }
        else if(!props.stopped&&props.alone){
          return 'primary'
        }
        else {
          return 'outline-danger'
        }
    }

    return (
        <Button variant={getStatusButtonVariant(props)} onClick={props.handler}>
            {!props.stopped && props.alone && 
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" />
            }
            {
                (props.stopped&&'connect')||(!props.alone&&!props.stopped&&"stop")
            }
        </Button>
    )
}
