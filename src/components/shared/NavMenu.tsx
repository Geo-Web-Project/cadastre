import React from "react";
import NavDropdown from "react-bootstrap/NavDropdown";
import Stack from "react-bootstrap/Stack";
import Image from "react-bootstrap/Image";
import OnRampWidget from "./OnRampWidget";
import FarcasterIcon from "../../assets/farcaster.svg";

export default function NavMenu({ account }: { account?: string }) {
  if (import.meta.env.MODE === "mainnet") {
    return <NavMenuMainnet account={account} />;
  } else {
    return <NavMenuTestnet account={account} />;
  }
}

function NavMenuMainnet({ account }: { account?: string }) {
  return (
    <NavDropdown
      title={<Image src="more-menu.svg" alt="more-menu" width={36} />}
      id="collasible-nav-dropdown"
      menuVariant="dark"
      align="end"
    >
      <NavDropdown.Item className="d-flex gap-2">
        <OnRampWidget target={<span>Buy ETH</span>} accountAddress={account} />
      </NavDropdown.Item>
      <NavDropdown.Item
        href="https://docs.geoweb.network/"
        target="_blank"
        rel="noopener"
        className="d-flex gap-2"
      >
        Documentation
      </NavDropdown.Item>
      <NavDropdown.Item
        href="https://testnet.geoweb.land/"
        target="_blank"
        rel="noopener"
        className="d-flex gap-2"
      >
        Cadastre Testnet
      </NavDropdown.Item>
      <NavDropdown.Item
        href="https://www.geoweb.network/terms"
        target="_blank"
        rel="noopener"
        className="d-flex gap-2"
      >
        Terms of Service
      </NavDropdown.Item>
      <NavDropdown.Item
        href="https://www.geoweb.network/privacy"
        target="_blank"
        rel="noopener"
        className="d-flex gap-2"
      >
        Privacy Policy
      </NavDropdown.Item>
      <SocialItems />
    </NavDropdown>
  );
}

function NavMenuTestnet({ account }: { account?: string }) {
  return (
    <NavDropdown
      title={<Image src="more-menu.svg" alt="more-menu" width={36} />}
      id="collasible-nav-dropdown"
      menuVariant="dark"
      align="end"
    >
      <NavDropdown.Item>
        <OnRampWidget target={<span>Buy ETH</span>} accountAddress={account} />
      </NavDropdown.Item>
      <NavDropdown.Item
        href="https://docs.optimism.io/builders/tools/build/faucets"
        target="_blank"
        rel="noopener"
        className="d-flex gap-2"
      >
        Get Testnet ETH
      </NavDropdown.Item>
      <NavDropdown.Item
        href="https://docs.geoweb.network/"
        target="_blank"
        rel="noopener"
        className="d-flex gap-2"
      >
        Documentation
      </NavDropdown.Item>
      <NavDropdown.Item
        href="https://geoweb.land/"
        target="_blank"
        rel="noopener"
        className="d-flex gap-2"
      >
        Cadastre Mainnet
      </NavDropdown.Item>
      <NavDropdown.Item
        href="https://www.geoweb.network/terms"
        target="_blank"
        rel="noopener"
        className="d-flex gap-2"
      >
        Terms of Service
      </NavDropdown.Item>
      <NavDropdown.Item
        href="https://www.geoweb.network/privacy"
        target="_blank"
        rel="noopener"
        className="d-flex gap-2"
      >
        Privacy Policy
      </NavDropdown.Item>
      <SocialItems />
    </NavDropdown>
  );
}

function SocialItems() {
  return (
    <Stack direction="horizontal" className="justify-content-around align-items-center mt-1">
      <NavDropdown.Item
        href="https://discord.com/invite/reXgPru7ck"
        target="_blank"
        rel="noopener"
        bsPrefix="none"
      >
        <Image src="discord.svg" alt="discord" width={22} />
      </NavDropdown.Item>
      <NavDropdown.Item
        href="https://twitter.com/thegeoweb"
        target="_blank"
        rel="noopener"
        bsPrefix="none"
      >
        <Image src="twitter.svg" alt="twitter" width={22} />
      </NavDropdown.Item>
      <NavDropdown.Item
        href="https://warpcast.com/geoweb"
        target="_blank"
        rel="noopener"
        bsPrefix="none"
      >
        <Image src={FarcasterIcon} alt="farcaster" width={18} />
      </NavDropdown.Item>
      <NavDropdown.Item
        href="https://github.com/Geo-Web-Project"
        target="_blank"
        rel="noopener"
        bsPrefix="none"
      >
        <Image src="github.svg" alt="github" width={22} />
      </NavDropdown.Item>
    </Stack>
  );
}
