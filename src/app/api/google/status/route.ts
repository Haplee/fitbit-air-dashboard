import { NextResponse } from "next/server";
import { db, googleConnections } from "@/lib/db";
import { eq } from "drizzle-orm";
import { googleIsConfigured } from "@/lib/google-health";
export const dynamic="force-dynamic";
export async function GET(){try{const [row]=await db.select({lastSyncAt:googleConnections.lastSyncAt,lastSyncStatus:googleConnections.lastSyncStatus}).from(googleConnections).where(eq(googleConnections.ownerKey,"owner")).limit(1);return NextResponse.json({configured:googleIsConfigured(),connected:Boolean(row),lastSyncAt:row?.lastSyncAt??null,lastSyncStatus:row?.lastSyncStatus??"never"});}catch(e){console.error("google_status",e);return NextResponse.json({configured:googleIsConfigured(),connected:false,lastSyncAt:null,lastSyncStatus:"database_error"});}}
