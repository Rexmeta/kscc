#!/bin/bash
set -e
npm install
npm run db:push
npm run acl:ensure-executive
npm run acl:ensure-survey
