import type {user} from "@types";

export type session_user = Omit<user, "avatar" | "password"> & { avatar: string };
