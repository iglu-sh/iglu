import { NextRequest, NextResponse } from "next/server";
import { db, User } from "@iglu-sh/common";
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } },
) {
    const { id } = await params;
    const DB = new db.DynamicDatabase();
    const userDB = new User(DB);
    try {
        await DB.connect();
        const avatarBuffer = await userDB.getAvatarById(id);
        await DB.disconnect();
        return new NextResponse(Buffer.from(avatarBuffer), { status: 200 });
    } catch (e) {
        console.error(e);
        NextResponse.json({ status: 204 });
        return;
    }
}
