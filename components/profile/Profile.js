import React from "react";
import Modal from 'react-bootstrap/Modal';

function Profile(props) {

    const [addr, setAddr] = React.useState("0x8833...4029");
    const [ethBalance, setEthBalance] = React.useState("8.000 ETH");

    const [show, setShow] = React.useState(false);

    const handleClose = () => setShow(false);
    const handleShow = () => setShow(true);

    function ProfileModal() {
        return(
            <Modal show={show} onHide={handleClose}>
                <Modal.Header closeButton>
                <Modal.Title>Profile</Modal.Title>
                </Modal.Header>
                <Modal.Body>Woohoo, you're reading this text in a modal!</Modal.Body>
            </Modal>
        );
    }

    return(
        <>
        <div style={{position: "absolute", width: 356, height: 30, right: 379, top: 26 }} onClick={handleShow}>
            
            <div id="profile-bg" style={{position: "absolute", width: "100%", height: "100%", background: "#4B5588",
                        border: "1px solid #4B5588", boxSizing: "border-box", borderRadius: 5 }} />

            <span style={{ position: "absolute", left: "31.46%", right: "42.13%", top: "20%", bottom: "20%",
                fontFamily: "Abel", fontStyle: "normal", fontWeight: "normal", fontSize: 18, lineHeight: 15,
                display: "flex", alignItems: "center", textAlign: "center", color: "#FFFFFF" }} >
                    {ethBalance}
            </span>

            <div id="profile-in" style={{position: "absolute", left: "60.11%", right: "0.28%",
                        top: "3.33%", bottom: "3.33%", background: "#111320", border: "1px solid #4B5588",
                        boxSizing: "border-box", borderRadius: 5 }} />

            <span style={{ position: "absolute", left: "61.52%", right: "7.58", top: "20%", bottom: "20%",
                fontFamily: "Abel", fontStyle: "normal", fontWeight: "normal", fontSize: 18, lineHeight: 15, 
                display: "flex", alignItems: "center", textAlign: "center", color: "#FFFFFF"}} > 
                    {addr} 
            </span>
            

            <img style={{position: "absolute", width: 20, height: 20, left: 332, top: 5 }} 
                src={'./ProfileIcon.png'} />

        </div>

        <ProfileModal />
        </>
    )

}

export default Profile;