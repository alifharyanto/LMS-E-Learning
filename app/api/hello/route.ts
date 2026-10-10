import {NextResponse} from "next/server";

export async function GET(){
    return NextResponse.json({
        status: 200,
        message: "Hello",
        date: new Date().toISOString()
    })
}