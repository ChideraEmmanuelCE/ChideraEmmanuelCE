import {test} from 'node:test';
import assert from 'node:assert/strict';
import {AIRCRAFT,spawn,updateFlight,getSeason,nearestAirport,REGIONS} from '../src/flight.js';

test('ten distinct aircraft, three regions',()=>{assert.equal(AIRCRAFT.length,10);assert.equal(new Set(AIRCRAFT.map(p=>p.id)).size,10);assert.equal(REGIONS.length,3)});
test('calendar in November/December/January',()=>{assert.equal(getSeason(10).id,'november');assert.equal(getSeason(11).snow,true);assert.equal(getSeason(0).id,'january')});
test('airplane accelerates under full throttle',()=>{const s=spawn(AIRCRAFT[0]);s.throttle=1;for(let i=0;i<250;i++)updateFlight(s,{pitch:0,bank:0,rudder:0,throttleDelta:0,brake:false},.02,AIRCRAFT[0]);assert.ok(s.speed>10);assert.equal(s.airborne,false)});
test('takeoff when sufficient airspeed with pitch up',()=>{const spec=AIRCRAFT[0],s=spawn(spec);s.speed=spec.takeoff+10;s.throttle=1;let ev;for(let i=0;i<55&&!s.airborne;i++){ev=updateFlight(s,{pitch:1,bank:0,rudder:0,throttleDelta:0,brake:false},.02,spec)}assert.equal(s.airborne,true);assert.equal(ev,'takeoff')});
test('gear-up landing damages aircraft',()=>{const spec=AIRCRAFT[0],s=spawn(spec);s.airborne=true;s.gear=false;s.y=2.5;s.vy=-4;s.speed=48;s.pitch=-.1;let ev;for(let i=0;i<80;i++){ev=updateFlight(s,{pitch:0,bank:0,rudder:0,throttleDelta:0,brake:false},.02,spec);if(ev==='crash')break}assert.equal(ev,'crash');assert.equal(s.crashed,true)});
test('nearest airport is found',()=>{assert.equal(nearestAirport(-950,-420).airport.id,'VBI');assert.equal(nearestAirport(1400,1050).airport.id,'NFD')});
