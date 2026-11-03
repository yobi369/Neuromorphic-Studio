import test,{before,after} from "node:test";
import assert from "node:assert/strict";
import express from "express";
import supertest from "supertest";
import {initializePersistence,registerInfrastructureRoutes,closePersistence,consumeAiQuota} from "../../server/persistence.ts";
let agentA:any,agentB:any,testApp:express.Express;
let projectId="",experimentId="";
before(async()=>{
 if(!process.env.DATABASE_URL)throw new Error("DATABASE_URL is required for persistence integration tests");
 await initializePersistence();
 testApp=express();testApp.use(express.json());registerInfrastructureRoutes(testApp);
 agentA=supertest.agent(testApp);agentB=supertest.agent(testApp);
});
after(async()=>{await closePersistence();});
test("PostgreSQL auth, project ownership and experiment isolation",async()=>{
 const a=await agentA.post("/api/auth/register").send({email:"owner-a@example.test",password:"a-very-long-test-password-123",name:"Owner A"});
 const b=await agentB.post("/api/auth/register").send({email:"owner-b@example.test",password:"another-long-test-password-456",name:"Owner B"});
 assert.equal(a.status,201);assert.equal(b.status,201);
 for(let i=0;i<4;i++)assert.equal(await consumeAiQuota(a.body.user.id),"ok");
 assert.equal(await consumeAiQuota(a.body.user.id),"minute");
 const created=await agentA.post("/api/projects").send({name:"Private project",config:{layers:[8,4]}});
 assert.equal(created.status,201);projectId=created.body.project.id;
 const own=await agentA.get("/api/projects");assert.equal(own.status,200);assert.equal(own.body.projects.length,1);
 const foreign=await agentB.get("/api/projects");assert.equal(foreign.status,200);assert.equal(foreign.body.projects.length,0);
 const exp=await agentA.post("/api/experiments").send({name:"Saved run manifest",projectId,manifest:{seed:7,kind:"integration-test"},result:{accuracy:0.9}});
 assert.equal(exp.status,201);experimentId=exp.body.experiment.id;
 const hidden=await agentB.get("/api/experiments/"+experimentId);assert.equal(hidden.status,404);
 const crossProject=await agentB.post("/api/experiments").send({name:"Cross-tenant attempt",projectId,manifest:{seed:8}});
 assert.equal(crossProject.status,404);
 const me=await agentA.get("/api/auth/me");assert.equal(me.status,200);assert.equal(me.body.user.email,"owner-a@example.test");
});
test("Unauthenticated project reads and malformed IDs fail closed",async()=>{
 const anonymous=supertest(testApp);
 const noSession=await anonymous.get("/api/projects");assert.equal(noSession.status,401);
 const invalid=await agentA.get("/api/experiments/not-a-uuid");assert.equal(invalid.status,400);
});
