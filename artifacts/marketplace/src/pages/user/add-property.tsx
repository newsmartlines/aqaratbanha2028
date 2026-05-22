import { useEffect } from "react";
import { useLocation } from "wouter";

export default function UserAddPropertyRedirect() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/add-property", { replace: true });
  }, [setLocation]);
  return null;
}
