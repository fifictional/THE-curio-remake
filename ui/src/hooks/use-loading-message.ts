import { useCoreContext } from "@/providers";
import { useEffect, useState } from "react";

export const useLoadingMessage = () => {
    const { document } = useCoreContext();
    const [message, setMessage] = useState('')
    useEffect(() => {
        if (document?.type?.toLowerCase().includes("image")) {
            setMessage("I am analyzing the image. Hang on tight!")
        } else if (document?.type?.toLowerCase() !== 'youtube') {
            setMessage("I am reading the document. Hang on tight!")
        } else {
            setMessage("I am watching the video. Hang on tight!")
        }
    }, [document]);

    return { message };
};