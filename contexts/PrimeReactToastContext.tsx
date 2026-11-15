"use client";
import React, {
    createContext,
    useCallback,
    useContext,
    useMemo,
    useRef,
    ReactNode,
} from "react";
import { Toast } from "primereact/toast";


// Define the context type
type PrimeReactToastContextType = {
    success: (summary: string, detail?: string) => void;
    error: (summary: string, detail?: string) => void;
    info: (summary: string, detail?: string) => void;
    warn: (summary: string, detail?: string) => void;
};

// Internal React context object
const PrimeReactToastCtx = createContext<PrimeReactToastContextType | undefined>(undefined);

// PrimeReactToastContext Component
export const PrimeReactToastContext = ({ children }: { children: ReactNode }) => {
    const toastRef = useRef<Toast>(null);

    const showToast = useCallback(
        (severity: "success" | "error" | "info" | "warn", summary: string, detail?: string) => {
            toastRef.current?.show({ severity, summary, detail, life: 3000 });
        },
        [],
    );

    /*
     * MEMOISED, and it is not a micro-optimisation.
     *
     * This object was rebuilt on every render, so `toast` changed identity for
     * every consumer in the application, and anything holding it in a dependency
     * array re-ran constantly. On the Performance map that array built Leaflet
     * controls: they were torn down and replaced so often that a `mousedown` on
     * the fullscreen button landed on a node that was gone by `mouseup`, so the
     * button needed two clicks and the map dragged with nothing held.
     *
     * The ref never changes, so the four functions never need to.
     */
    const contextValue = useMemo(
        () => ({
            success: (summary: string, detail?: string) => showToast("success", summary, detail),
            error: (summary: string, detail?: string) => showToast("error", summary, detail),
            info: (summary: string, detail?: string) => showToast("info", summary, detail),
            warn: (summary: string, detail?: string) => showToast("warn", summary, detail),
        }),
        [showToast],
    );

    return (
        <PrimeReactToastCtx.Provider value={contextValue}>

            {children}
            <Toast ref={toastRef} />
        </PrimeReactToastCtx.Provider>
    );
};

// Hook to use toast
export const usePrimeReactToast = () => {
    const context = useContext(PrimeReactToastCtx);
    if (!context) {
        throw new Error("usePrimeReactToast must be used within a PrimeReactToastContext");
    }
    return context;
};
