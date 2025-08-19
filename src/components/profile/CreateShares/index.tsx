"use client";

import { Card, CardHeader, CardContent } from "@/components/ui/cards";
import { Button } from "@/components/ui/button";
import CreateSharesForm from "@/components/profile/CreateShares/Form";
import useCreateShares from "./useCreateShares";

export default function CreateShares() {
  const {
    state,
    setState,
    participants,
    toggle,
    handleCreate,
  } = useCreateShares();

  return (
    <div className="relative">
        <div className="sticky top-0 z-20 bg-white border-b">
            <div className="mx-auto max-w-6xl px-4 md:px-6 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex min-w-0 items-center gap-3">
                        <div className="h-9 w-9 rounded-2xl border flex items-center justify-center shadow-sm">
                            <span className="text-sm font-semibold">SSS</span>
                        </div>
                        <div className="truncate">
                            <h1 className="text-lg md:text-xl font-semibold leading-6 truncate">Разделение секрета</h1>
                            <p className="text-muted-foreground text-xs md:text-sm">Здесь вы можете разделить секрет</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div className="space-y-6 p-4">
            <Card>
                <CardHeader title="Создать VSS-доли секрета" />
                <CardContent>
                <CreateSharesForm
                    state={state}
                    setState={setState}
                    participants={participants}
                    onToggle={toggle}
                />

                <Button
                    onClick={handleCreate}
                    disabled={state.type === "CUSTOM" && !state.secret}
                >
                    Генерировать и отправить
                </Button>
                </CardContent>
            </Card>
        </div>
    </div>
  );
}
