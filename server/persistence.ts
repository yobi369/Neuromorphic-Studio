import { createHash, randomBytes, randomUUID, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { Express, Request, Response, NextFunction } from "express";
import { Pool } from "pg";
const scrypt=promisify(scryptCb);
let pool:Pool|null=null;
const sessionTtlSeconds=60*60*24*7;
const hashToken=(token:string)=>createHash("sha256").update(token).digest("hex");
const parseCookie=(header:string|undefined,name:string)=>header?.split(";").map(x=>x.trim()).find(x=>x.startsWith(name+"="))?.slice(name.length+1);
const cookieOptions=(secure:boolean)=>`Path=/; HttpOnly; SameSite=Strict; Max-Age=${sessionTtlSeconds}${secure?"; Secure":""}`;
async function passwordHash(password:string){const salt=randomBytes(16);const key=await scrypt(password,salt,64) as Buffer;return salt.toString("hex")+":"+key.toString("hex");}
async function verifyPassword(password:string,stored:string){const [saltHex,keyHex]=stored.split(":");if(!saltHex||!keyHex)return false;const expected=Buffer.from(keyHex,"hex"),actual=await scrypt(password,Buffer.from(saltHex,"hex"),expected.length) as Buffer;return actual.length===expected.length&&timingSafeEqual(actual,expected);}
function authUnavailable(_req:Request,res:Response){res.status(503).json({error:"Persistent authentication is unavailable. Configure DATABASE_URL and restart the service.",code:"DATABASE_NOT_CONFIGURED"});}
const authAttempts=new Map<string,{count:number;resetAt:number}>();
function rateLimitAuth(req:Request,res:Response,next:NextFunction){const key=req.ip||"unknown",now=Date.now(),v=authAttempts.get(key);if(!v||v.resetAt<now){authAttempts.set(key,{count:1,resetAt:now+15*60_000});return next();}if(v.count>=10)return res.status(429).json({error:"Too many authentication attempts. Try again later."});v.count++;next();}
function csrfGuard(req:Request,res:Response,next:NextFunction){const origin=req.get("origin");if(origin){const host=req.get("host");const expected=`${req.protocol}://${host}`;if(origin!==expected)return res.status(403).json({error:"Cross-origin request rejected."});}next();}
export async function requireAuthenticatedUser(req:Request,res:Response,next:NextFunction){
 if(!pool)return authUnavailable(req,res);
 const token=parseCookie(req.headers.cookie,"ns_session");if(!token)return res.status(401).json({error:"Authentication required."});
 try{const result=await pool.query("SELECT user_id FROM sessions WHERE token_hash=$1 AND expires_at>now()",[hashToken(token)]);if(!result.rowCount)return res.status(401).json({error:"Session expired. Sign in again."});res.locals.userId=result.rows[0].user_id;next();}catch{return res.status(503).json({error:"Authentication storage temporarily unavailable."});}
}
const isUuid=(value:unknown):value is string=>typeof value==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
const safeProject=(row:any)=>({...row.payload,id:row.id,createdAt:row.created_at,updatedAt:row.updated_at});
export async function initializePersistence():Promise<boolean>{
 if(!process.env.DATABASE_URL){pool=null;return false;}
 pool=new Pool({connectionString:process.env.DATABASE_URL,ssl:process.env.PGSSLMODE==="require"?{rejectUnauthorized:false}:undefined,max:10,idleTimeoutMillis:30_000,connectionTimeoutMillis:5_000});
 await pool.query("SELECT 1");
 await pool.query(`
 CREATE TABLE IF NOT EXISTS users(id uuid PRIMARY KEY,email text NOT NULL UNIQUE,password_hash text NOT NULL,display_name text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS sessions(token_hash text PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires_at timestamptz NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
 CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions(user_id);
 CREATE TABLE IF NOT EXISTS projects(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,name text NOT NULL,payload jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),updated_at timestamptz NOT NULL DEFAULT now());
 CREATE INDEX IF NOT EXISTS projects_user_updated_idx ON projects(user_id,updated_at DESC);
 CREATE TABLE IF NOT EXISTS experiments(id uuid PRIMARY KEY,user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,project_id uuid REFERENCES projects(id) ON DELETE SET NULL,name text NOT NULL,manifest jsonb NOT NULL,result jsonb,created_at timestamptz NOT NULL DEFAULT now());
 CREATE INDEX IF NOT EXISTS experiments_user_created_idx ON experiments(user_id,created_at DESC);
 CREATE TABLE IF NOT EXISTS ai_usage(user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,window_type text NOT NULL,window_start timestamptz NOT NULL,requests integer NOT NULL DEFAULT 0,PRIMARY KEY(user_id,window_type,window_start));
 CREATE INDEX IF NOT EXISTS ai_usage_window_idx ON ai_usage(window_start);
 `);
 return true;
}
export function registerInfrastructureRoutes(app:Express){
 app.post("/api/auth/register",rateLimitAuth,csrfGuard,async(req,res)=>{
  if(!pool)return authUnavailable(req,res);
  const email=typeof req.body?.email==="string"?req.body.email.trim().toLowerCase():"";
  const password=typeof req.body?.password==="string"?req.body.password:"";
  const name=typeof req.body?.name==="string"?req.body.name.trim().slice(0,100):"";
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)return res.status(400).json({error:"A valid email address is required."});
  if(password.length<12||password.length>256)return res.status(400).json({error:"Password must contain 12–256 characters."});
  if(!name)return res.status(400).json({error:"Display name is required."});
  try{await pool.query("DELETE FROM sessions WHERE expires_at<now()");const hash=await passwordHash(password),created=await pool.query("INSERT INTO users(id,email,password_hash,display_name) VALUES($1,$2,$3,$4) RETURNING id,email,display_name",[randomUUID(),email,hash,name]);
   const token=randomBytes(32).toString("base64url");await pool.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",[hashToken(token),created.rows[0].id]);
   res.setHeader("Set-Cookie",`ns_session=${token}; ${cookieOptions(process.env.NODE_ENV==="production")}`);return res.status(201).json({user:created.rows[0]});
  }catch(e:any){if(e?.code==="23505")return res.status(409).json({error:"An account with this email already exists."});return res.status(503).json({error:"Could not create account."});}
 });
 app.post("/api/auth/login",rateLimitAuth,csrfGuard,async(req,res)=>{
  if(!pool)return authUnavailable(req,res);
  const email=typeof req.body?.email==="string"?req.body.email.trim().toLowerCase():"",password=typeof req.body?.password==="string"?req.body.password:"";
  if(!email||password.length>256)return res.status(400).json({error:"Email and password are required."});
  try{await pool.query("DELETE FROM sessions WHERE expires_at<now()");const found=await pool.query("SELECT id,email,display_name,password_hash FROM users WHERE email=$1",[email]);const valid=found.rowCount?await verifyPassword(password,found.rows[0].password_hash):false;
   if(!valid)return res.status(401).json({error:"Invalid email or password."});
   const token=randomBytes(32).toString("base64url");await pool.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",[hashToken(token),found.rows[0].id]);
   res.setHeader("Set-Cookie",`ns_session=${token}; ${cookieOptions(process.env.NODE_ENV==="production")}`);return res.json({user:{id:found.rows[0].id,email:found.rows[0].email,display_name:found.rows[0].display_name}});
  }catch{return res.status(503).json({error:"Authentication service temporarily unavailable."});}
 });
 app.get("/api/auth/me",requireAuthenticatedUser,async(_req,res)=>{const r=await pool!.query("SELECT id,email,display_name,created_at FROM users WHERE id=$1",[res.locals.userId]);if(!r.rowCount)return res.status(401).json({error:"Account no longer exists."});res.json({user:r.rows[0]});});
 app.post("/api/auth/logout",csrfGuard,async(req,res)=>{const token=parseCookie(req.headers.cookie,"ns_session");if(pool&&token)await pool.query("DELETE FROM sessions WHERE token_hash=$1",[hashToken(token)]);res.setHeader("Set-Cookie",`ns_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${process.env.NODE_ENV==="production"?"; Secure":""}`);res.json({success:true});});
 app.get("/api/projects",requireAuthenticatedUser,async(_req,res)=>{const r=await pool!.query("SELECT id,payload,created_at,updated_at FROM projects WHERE user_id=$1 ORDER BY updated_at DESC",[res.locals.userId]);res.json({projects:r.rows.map(safeProject),total:r.rowCount});});
 app.post("/api/projects",requireAuthenticatedUser,csrfGuard,async(req,res)=>{
  const body=req.body;if(!body||typeof body.name!=="string"||!body.name.trim()||body.name.length>160)return res.status(400).json({error:"Project name must contain 1–160 characters."});
  const id=isUuid(body.id)?body.id:randomUUID();
  try{const existing=await pool!.query("SELECT id FROM projects WHERE id=$1 AND user_id=$2",[id,res.locals.userId]);if(existing.rowCount){const r=await pool!.query("UPDATE projects SET name=$3,payload=$4,updated_at=now() WHERE id=$1 AND user_id=$2 RETURNING id,payload,created_at,updated_at",[id,res.locals.userId,body.name.trim(),JSON.stringify({...body,id})]);return res.json({success:true,project:safeProject(r.rows[0])});}
   const r=await pool!.query("INSERT INTO projects(id,user_id,name,payload) VALUES($1,$2,$3,$4) RETURNING id,payload,created_at,updated_at",[id,res.locals.userId,body.name.trim(),JSON.stringify({...body,id})]);return res.status(201).json({success:true,project:safeProject(r.rows[0])});
  }catch{return res.status(503).json({error:"Project storage unavailable."});}
 });
 app.delete("/api/projects/:id",requireAuthenticatedUser,csrfGuard,async(req,res)=>{if(!isUuid(req.params.id))return res.status(400).json({error:"Invalid project ID."});const r=await pool!.query("DELETE FROM projects WHERE id=$1 AND user_id=$2 RETURNING id",[req.params.id,res.locals.userId]);if(!r.rowCount)return res.status(404).json({error:"Project not found."});res.json({success:true,deletedId:r.rows[0].id});});
 app.get("/api/experiments",requireAuthenticatedUser,async(req,res)=>{const projectId=typeof req.query.projectId==="string"?req.query.projectId:null;if(projectId&&!isUuid(projectId))return res.status(400).json({error:"Invalid project ID."});const r=await pool!.query("SELECT id,project_id,name,manifest,result,created_at FROM experiments WHERE user_id=$1 AND ($2::uuid IS NULL OR project_id=$2) ORDER BY created_at DESC LIMIT 200",[res.locals.userId,projectId]);res.json({experiments:r.rows});});
 app.post("/api/experiments",requireAuthenticatedUser,csrfGuard,async(req,res)=>{
  const b=req.body;if(!b||typeof b.name!=="string"||!b.name.trim()||!b.manifest||typeof b.manifest!=="object"||Array.isArray(b.manifest))return res.status(400).json({error:"Experiment name and JSON manifest are required."});
  const projectId=typeof b.projectId==="string"?b.projectId:null;if(projectId&&!isUuid(projectId))return res.status(400).json({error:"Invalid project ID."});if(projectId){const owned=await pool!.query("SELECT 1 FROM projects WHERE id=$1 AND user_id=$2",[projectId,res.locals.userId]);if(!owned.rowCount)return res.status(404).json({error:"Project not found in this account."});}
  const r=await pool!.query("INSERT INTO experiments(id,user_id,project_id,name,manifest,result) VALUES($1,$2,$3,$4,$5,$6) RETURNING id,project_id,name,manifest,result,created_at",[randomUUID(),res.locals.userId,projectId,b.name.trim().slice(0,160),JSON.stringify(b.manifest),b.result?JSON.stringify(b.result):null]);res.status(201).json({experiment:r.rows[0]});
 });
 app.get("/api/experiments/:id",requireAuthenticatedUser,async(req,res)=>{if(!isUuid(req.params.id))return res.status(400).json({error:"Invalid experiment ID."});const r=await pool!.query("SELECT id,project_id,name,manifest,result,created_at FROM experiments WHERE id=$1 AND user_id=$2",[req.params.id,res.locals.userId]);if(!r.rowCount)return res.status(404).json({error:"Experiment not found."});res.json({experiment:r.rows[0]});});
 app.get("/api/infrastructure/status",(_req,res)=>res.json({databaseConfigured:Boolean(pool),authentication:"database-backed-session",projectIsolation:"user-scoped",experimentHistory:Boolean(pool)}));
}

export async function consumeAiQuota(userId:string):Promise<"ok"|"minute"|"day">{
 if(!pool)throw new Error("Database not configured");
 const client=await pool.connect();
 try{
  await client.query("DELETE FROM ai_usage WHERE window_start < now() - interval '2 days'");
  await client.query("BEGIN");
  const minute=await client.query("INSERT INTO ai_usage(user_id,window_type,window_start,requests) VALUES($1,'minute',date_trunc('minute',now()),1) ON CONFLICT(user_id,window_type,window_start) DO UPDATE SET requests=ai_usage.requests+1 WHERE ai_usage.requests<8 RETURNING requests",[userId]);
  if(!minute.rowCount){await client.query("ROLLBACK");return "minute";}
  const day=await client.query("INSERT INTO ai_usage(user_id,window_type,window_start,requests) VALUES($1,'day',date_trunc('day',now()),1) ON CONFLICT(user_id,window_type,window_start) DO UPDATE SET requests=ai_usage.requests+1 WHERE ai_usage.requests<60 RETURNING requests",[userId]);
  if(!day.rowCount){await client.query("ROLLBACK");return "day";}
  await client.query("COMMIT");return "ok";
 }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
}

export async function closePersistence(){if(pool){const active=pool;pool=null;await active.end();}}

export async function consumeEvaluationQuota(userId:string):Promise<"ok"|"minute"|"day">{
 if(!pool)throw new Error("Database not configured");
 const client=await pool.connect();
 try{
  await client.query("DELETE FROM ai_usage WHERE window_start < now() - interval '2 days'");
  await client.query("BEGIN");
  const minute=await client.query("INSERT INTO ai_usage(user_id,window_type,window_start,requests) VALUES($1,'evaluation_minute',date_trunc('minute',now()),1) ON CONFLICT(user_id,window_type,window_start) DO UPDATE SET requests=ai_usage.requests+1 WHERE ai_usage.requests<5 RETURNING requests",[userId]);
  if(!minute.rowCount){await client.query("ROLLBACK");return "minute";}
  const day=await client.query("INSERT INTO ai_usage(user_id,window_type,window_start,requests) VALUES($1,'evaluation_day',date_trunc('day',now()),1) ON CONFLICT(user_id,window_type,window_start) DO UPDATE SET requests=ai_usage.requests+1 WHERE ai_usage.requests<30 RETURNING requests",[userId]);
  if(!day.rowCount){await client.query("ROLLBACK");return "day";}
  await client.query("COMMIT");return "ok";
 }catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
}
