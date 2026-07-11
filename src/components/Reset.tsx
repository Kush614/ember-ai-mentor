import { useState } from "react";
import { useStore } from "../lib/store";

// Hidden demo-reset route: restores Maya to her sess_004 state.
export default function Reset() {
  const resetDemo = useStore((s) => s.resetDemo);
  const logout = useStore((s) => s.logout);
  const [done, setDone] = useState(false);

  return (
    <div className="h-full grid place-items-center bg-morning">
      <div className="text-center">
        <p className="font-data text-sm text-slate2 mb-4">Demo reset · restores Maya to sess_004</p>
        <button
          onClick={async () => {
            await resetDemo();
            logout();
            setDone(true);
            setTimeout(() => (location.hash = "#/"), 700);
          }}
          className="rounded-full bg-ember text-white font-bold px-8 py-3 text-base hover:brightness-110 transition"
        >
          {done ? "Reset done" : "Reset demo"}
        </button>
      </div>
    </div>
  );
}
