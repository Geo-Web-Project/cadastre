import { createContext, ReactNode, useContext } from "react";
import { SyncWorldResult } from "@geo-web/mud-world-base-setup";

type Props = {
  children: ReactNode;
  value: typeof SyncWorldResult;
};

const MUDContext = createContext<typeof SyncWorldResult | null>(null);

const MUDProvider = ({ children, value }: Props) => {
  const currentValue = useContext(MUDContext);
  if (currentValue) throw new Error("MUDProvider can only be used once");
  return <MUDContext.Provider value={value}>{children}</MUDContext.Provider>;
};

const useMUD = () => {
  const value = useContext(MUDContext);
  if (!value) throw new Error("Must be used within a MUDProvider");
  return value;
};

export { MUDProvider, useMUD };
