import {SessionProvider} from "next-auth/react";

export default async function BuilderLayout({
                                            children,
                                        }: Readonly<{ children: React.ReactNode }>) {
    return(
        <SessionProvider>
            {children}
        </SessionProvider>
    )
}