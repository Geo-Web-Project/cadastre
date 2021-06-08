import * as React from "react";
import { useState, useEffect } from "react";

function HomeContent ()
{
    return (
        <>
            <p>{"The Geo Web is an augmented reality metaverse."}</p>
            <p>{"It’s created with a set of open protocols and a system of property rights for anchoring digital content like augmented reality, non-fungible tokens (NFTs), games, images, video, audio, full websites, etc. to real world locations."}</p>
            <p>{"Think of it like a persistent virtual layer covering Earth on which content can be anchored and discovered."}</p> 
            <p>{"Claim your home or business’s digital land on the Geo Web."}</p> 
            <p>{"This application, the Cadastre, is used to claim, transfer, and manage digital land parcels which correspond to locations on Earth. Land holders get exclusive rights to anchor digital content within a parcel’s boundaries on the network, so what are you waiting for? "}</p> 
            <p>{"Browse the Geo Web with a universal geospatial browser."}</p> 
            <p>{" The Geo Web’s v1 browser can be found at browse.geoweb.eth.link/"}</p>  
            <p>{"It’s best expereienced on mobile/wearable devices. On a Geo Web browser, a user’s geolocation is used to automatically resolve the corresponding parcel’s content. It creates a frictionless and unified experience for always-on smart device displays and soon-to-arrive consumer smart glasses. In time, the Geo Web’s experience can become as natural as physical reality. "}</p> 
            <p>{"The Geo Web is a public good. "}</p> 
            <p>{"Everyone owns the Geo Web. It uses a unique property rights system known as partial common ownership to encourage efficient market dynamics, positive network effects, and egalitarian opportunity. Network funds generated from the system are used to fund more public goods and reward builders, creatives, and users for their contributions to the network. "}</p> 
            <p>{"Why should I care? "}</p> 
            <p>{"Web 2.0 is controlled by massive corporations who’s incentives don’t align with the common person’s. We see the impact of this in our economy, politics, and social well-being today. The internet will only increase in importance as augmented reality and digital content begin to prevade the physical world. The infrastructure that defines this REALITY shouldn’t governed by private, for-profit corporations. "}</p> 
            <p>{"The Web 3.0 movement (including the Geo Web) is looking to reverse these ills of centralization. We believe that the Geo Web’s permissionless, community-owned internet infrastructure can help create a better future with augmented SHARED reality."}</p> 
            <p>{" If you’re still here reading... props. You can dive even deeper on Geo Web vision at docs.geoweb.network/. Otherwise, connect your wallet, and go explore the Geo Web! */'"}</p> 
        </>
    )
}


function Home()
{
    return (
        <HomeContent />
    );
}

export default Home;