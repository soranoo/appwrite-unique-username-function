"use client";

import React, { useState, useCallback } from "react";
import { Button, Input, Spinner } from "@nextui-org/react";
import { debounce } from "lodash";
import { checkUsernameAvailabilityAction } from "~/actions/check-username-availability.action";
import { takeUsernameAction } from "~/actions/take-username.action";
import { toast } from "react-toastify";

export default function HomePage() {
  const [username, setUsername] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [isTaking, setIsTaking] = useState(false);

  const checkUsernameAvailability = useCallback(
    async (username: string) => {
      if (!username) {
        setIsChecking(false);
        setIsAvailable(null);
        return;
      }
      setIsChecking(true);
      try {
        const data = await checkUsernameAvailabilityAction({ username });
        console.log(data);
        setIsAvailable(data.isAvailable);
      } catch (error) {
        console.error("Error checking username availability:", error);
        setIsAvailable(false);
      } finally {
        setIsChecking(false);
      }
    },
    [setIsChecking, setIsAvailable],
  );

  const debouncedCheckUsernameAvailability = useCallback(
    debounce(checkUsernameAvailability, 300),
    [checkUsernameAvailability],
  );

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="space-y-2">
        <Input
          value={username}
          placeholder="Enter your username"
          endContent={isChecking ? <Spinner /> : null}
          onChange={(e) => {
            setUsername(e.target.value);
            debouncedCheckUsernameAvailability(e.target.value);
          }}
        />
        <div className="flex items-center justify-between">
          <Button
            isLoading={isTaking}
            isDisabled={!username || isChecking || !isAvailable}
            onPress={async () => {
              if (!username) {
                return;
              }

              setIsTaking(true);
              const checkRes = await checkUsernameAvailabilityAction({
                username: username,
              });
              if (checkRes.isAvailable) {
                const res = await takeUsernameAction({ username: username });
                toast(res.success ? `"${username}" is yours~` : res.error, {
                  type: res.success ? "success" : "error",
                });
                setUsername("");
              } else {
                toast("Username not available", { type: "error" });
              }
              setIsTaking(false);
            }}
          >
            {isAvailable === false ? "Username Taken" : "Take this username"}
          </Button>
        </div>
      </div>
    </main>
  );
}
