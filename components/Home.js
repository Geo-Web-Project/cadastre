import * as React from "react";
import { useState, useEffect } from "react";

import landingContent from "./home-style";
import videoInstruction from "./home-style";

function HomeContent ()
{
    return (
        <div style={{ position: "absolute", width: "68%", height: '80%', left: "4%", 
            top: "55%", color: "#FFFFFF", fontStyle: "normal", fontWeight: "normal" }} >
            <p style={{ fontSize: "33.6px", lineHeight: "45px" }} >{"The Geo Web is an augmented reality metaverse."}</p>
            <p style={{ fontSize: "18px", lineHeight: "22px" }} >{"It’s created with a set of open protocols and a system of property rights for anchoring digital content like augmented reality, non-fungible tokens (NFTs), games, images, video, audio, full websites, etc. to real world locations."}</p>
            <p style={{ fontSize: "18px", lineHeight: "22px" }} >{"Think of it like a persistent virtual layer covering Earth on which content can be anchored and discovered."}</p> 
            <p style={{ fontSize: "33.6px", lineHeight: "45px" }} >{"Claim your home or business’s digital land on the Geo Web."}</p> 
            <p style={{ fontSize: "18px", lineHeight: "22px" }} >{"This application, the Cadastre, is used to claim, transfer, and manage digital land parcels which correspond to locations on Earth. Land holders get exclusive rights to anchor digital content within a parcel’s boundaries on the network, so what are you waiting for? "}</p> 
            <p style={{ fontSize: "33.6px", lineHeight: "45px" }} >{"Browse the Geo Web with a universal geospatial browser."}</p> 
            <p style={{ fontSize: "18px", lineHeight: "22px" }} >{" The Geo Web’s v1 browser can be found at browse.geoweb.eth.link/"}</p>  
            <p style={{ fontSize: "18px", lineHeight: "22px" }} >{"It’s best expereienced on mobile/wearable devices. On a Geo Web browser, a user’s geolocation is used to automatically resolve the corresponding parcel’s content. It creates a frictionless and unified experience for always-on smart device displays and soon-to-arrive consumer smart glasses. In time, the Geo Web’s experience can become as natural as physical reality. "}</p> 
            <p style={{ fontSize: "33.6px", lineHeight: "45px" }} >{"The Geo Web is a public good. "}</p> 
            <p style={{ fontSize: "18px", lineHeight: "22px" }} >{"Everyone owns the Geo Web. It uses a unique property rights system known as partial common ownership to encourage efficient market dynamics, positive network effects, and egalitarian opportunity. Network funds generated from the system are used to fund more public goods and reward builders, creatives, and users for their contributions to the network. "}</p> 
            <p style={{ fontSize: "33.6px", lineHeight: "45px" }} >{"Why should I care? "}</p> 
            <p style={{ fontSize: "18px", lineHeight: "22px" }} >{"Web 2.0 is controlled by massive corporations who’s incentives don’t align with the common person’s. We see the impact of this in our economy, politics, and social well-being today. The internet will only increase in importance as augmented reality and digital content begin to prevade the physical world. The infrastructure that defines this REALITY shouldn’t governed by private, for-profit corporations. "}</p> 
            <p style={{ fontSize: "18px", lineHeight: "22px" }} >{"The Web 3.0 movement (including the Geo Web) is looking to reverse these ills of centralization. We believe that the Geo Web’s permissionless, community-owned internet infrastructure can help create a better future with augmented SHARED reality."}</p> 
            <p style={{ fontSize: "18px", lineHeight: "22px" }} >{"If you’re still here reading... props. You can dive even deeper on Geo Web vision at docs.geoweb.network/. Otherwise, connect your wallet, and go explore the Geo Web!"}</p> 
        </div>
    )
}

function WalletPrompt()
{   
    return(
        <div style={{position: "absolute", right: 0, top: "100px", width: "22%", height: "220%", 
            background: "#202333", color: "#FFFFFF", fontStyle: "normal", fontWeight: "normal" }}>
            <img src="vector.png" style={{ position: "absolute", left: "40%", top: "5%", width: "20%" }}/>
            <div style={{ textAlign: "center", width: "80%", left: "10%", position: "absolute", top: "11%" }}>
            <p style={{ fontSize: "33.6px", lineHeight: "45px" }}>{"Connect your Web3 wallet to the Kovan network to begin"}</p> 
            {/* <p style={{ fontSize: "33.6px", lineHeight: "45px" }}>{"Web3 wallet."}</p>  */}
            <p style={{ fontSize: "18px", lineHeight: "22px" }}>{"Note: The Cadastre uses IDX profiles to seamlessly manage the keys for linked content under your wallet address. After connecting your wallet, you’ll also be asked to connect/migrate/create your profile via 3ID Connect."}</p> 
            </div>
        </div>
    )
}

function Home()
{
    return (
        <>
            <div style={{ position: "absolute", left: "-2%", top: "100px", width: "80%", height: "220%",
                background: "url(bg.jpg) no-repeat center", backgroundSize: "cover"  }} />
            <iframe style={{ position: "absolute", left: "4%", top: "18%", background: "#C4C4C4"}} 
                width="24%" height="34%" src={"https://www.youtube.com/embed/JlnUQUDTpEY"} />
            <HomeContent />
            
            {/* */} 
            <WalletPrompt />    
        </>
    );
}

export default Home;
