import type { NextApiRequest, NextApiResponse,  } from 'next';
import { notificationEmitter } from '@/lib/events';
import { getServerSession }     from "next-auth/next";
import { authOptions }       from "@/lib/auth";
import { NextResponse }         from "next/server";