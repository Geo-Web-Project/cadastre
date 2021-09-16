import React from "react";
import {ethers} from "ethers";
import {truncateStr, truncateEth} from "../../lib/truncate";


function Profile(props) {

    const {account, ethBalance, handleShowProfile} = props;

    const [addr, setAddr] = React.useState("");
    const [balance, setBalance] = React.useState("");

    React.useEffect(()=>{

        if(account) setAddr(account);
        if(ethBalance) setBalance(ethers.utils.formatEther(ethBalance))

    }, [account, ethBalance])

    return(
        <div style={{position: "relative", width: 253, height: 30, right: "40%", top: "calc(100vh-15)" }} onClick={handleShowProfile}>
            
            <div id="profile-bg" style={{position: "absolute", width: "100%", height: "100%", background: "#4B5588",
                        border: "1px solid #4B5588", boxSizing: "border-box", borderRadius: 5 }} />

            <span style={{ position: "absolute", left: "15%", top: "20%", bottom: "20%",
                fontFamily: "Abel", fontStyle: "normal", fontWeight: "normal", fontSize: 18, lineHeight: 15,
                display: "flex", alignItems: "center", textAlign: "center", color: "#FFFFFF", cursor: "pointer" }} >
                    {truncateEth(balance, 3) + " ETH"}
            </span>

            <div id="profile-in" style={{position: "absolute", left: "60.11%", right: "0.28%", width: 154,
                        top: "3.33%", bottom: "3.33%", background: "#111320", border: "1px solid #4B5588",
                        boxSizing: "border-box", borderRadius: 5 }} />

            <span style={{ position: "absolute", left: "61.52%", right: "7.58", top: "20%", bottom: "20%",
                fontFamily: "Abel", fontStyle: "normal", fontWeight: "normal", fontSize: 18, lineHeight: 15, 
                display: "flex", alignItems: "center", textAlign: "center", color: "#FFFFFF", cursor: "pointer" }} > 
                    {truncateStr(addr,14)} 
            </span>
            

            <img style={{position: "absolute", width: 20, height: 20, right: -44, top: 5 }} 
                src={'./ProfileIcon.png'} />

        </div>
    )

}

export default Profile;