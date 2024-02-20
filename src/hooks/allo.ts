import { useAlloContext } from "../context/Allo";

export default function useAllo() {
  const {
    alloStrategy,
    recipients,
    recipientsDetails,
    passportDecoder,
    gdaPool,
  } = useAlloContext();

  return {
    alloStrategy,
    recipients,
    recipientsDetails,
    passportDecoder,
    gdaPool,
  };
}
