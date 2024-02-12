import { useSuperfluidContext } from "../context/Superfluid";

export default function useSuperfluid() {
  const { sfFramework, nativeSuperToken } = useSuperfluidContext();

  return {
    sfFramework,
    nativeSuperToken,
  };
}
