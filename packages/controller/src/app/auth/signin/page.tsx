"use client";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { getCsrfToken, SessionProvider, useSession } from "next-auth/react";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import { signIn } from "next-auth/react";
import { toast, Toaster } from "sonner";
export default function SignInWrapper() {
    return (
        <SessionProvider>
            <Suspense fallback={<>...</>}>
                <SignInPage />
            </Suspense>
        </SessionProvider>
    );
}
export function SignInPage() {
    // Get the session info to see if the user is logged in
    const session = useSession();
    const router = useRouter();
    const [signInObject, setSignInObject] = useState<{
        username: string;
        password: string;
    }>({ username: "", password: "" });
    const [error, setError] = useState<{
        message: string;
        header: string;
    } | null>(null);
    const params = useSearchParams();
    const signInErrorsToMessagesMap: Record<
        string,
        { message: string; header: string }
    > = {
        CredentialsSignin: {
            header: "Sign In Failed",
            message: "Invalid username or password.",
        },
        AccessDenied: {
            header: "Access Denied",
            message: "You do not have permission to access this application.",
        },
        MissingCSRFToken: {
            header: "Sign In Error",
            message:
                "There was a problem with your sign in request. Please try again. If you are the admin: Did you forget to set the AUTH_SECRET or NEXT_PUBLIC_URL environment variables?",
        },
        Default: {
            header: "Sign In Error",
            message: "An unknown error occurred. Please try again.",
        },
    };

    // Fetch the CSRF token on component mount
    useEffect(() => {
        const errorParam = params.get("error");
        if (errorParam && !error) {
            const errorMessage =
                signInErrorsToMessagesMap[errorParam] ??
                signInErrorsToMessagesMap.Default;
            setError(errorMessage!);
        }
    }, []);

    useEffect(() => {
        // Redirect if authenticated
        if (session.status === "authenticated") {
            router.push("/app");
        }
    }, [session]);

    async function login(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        toast.info("Signing in...", { duration: 2000 });
        const formData = new FormData(e.currentTarget);
        const username = formData.get("username") as string;
        const password = formData.get("password") as string;
        const keepSignedIn = formData.get("keepSignedIn") === "on";
        await signIn(
            "credentials",
            {
                username: username,
                password: password,
            },
            { remember: keepSignedIn },
        );
    }
    return (
        <div className="flex h-screen w-full items-center justify-center">
            <div className="w-full max-w-md px-4">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-2xl">Sign In</CardTitle>
                        <CardDescription>To continue to Iglu</CardDescription>
                    </CardHeader>
                    <CardContent className="flex w-full flex-col gap-4">
                        {error ? (
                            <Alert variant="destructive" className="w-full">
                                <AlertCircleIcon />
                                <AlertTitle>{error.header}</AlertTitle>
                                <AlertDescription>
                                    {error.message}
                                </AlertDescription>
                            </Alert>
                        ) : null}
                        <form
                            method="post"
                            onSubmit={(e) => login(e)}
                            className="flex w-full flex-col gap-4"
                        >
                            <div className="flex w-full flex-col items-center justify-between gap-4">
                                <div className="grid w-full gap-2">
                                    <Label htmlFor="username">Username</Label>
                                    <Input
                                        id="username"
                                        name="username"
                                        type="text"
                                        required
                                    />
                                </div>
                                <div className="grid w-full gap-2">
                                    <Label htmlFor="password">Password</Label>
                                    <Input
                                        id="password"
                                        name="password"
                                        type="password"
                                        required
                                    />
                                </div>
                                <div className="flex w-full flex-row gap-2">
                                    <Checkbox
                                        id="keepSignedIn"
                                        name="keepSignedIn"
                                    />
                                    <Label htmlFor="keepSignedIn">
                                        Keep me signed in
                                    </Label>
                                </div>
                            </div>
                            <Button type="submit" className="w-full">
                                Login
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
            <Toaster richColors={true} />
        </div>
    );
}
