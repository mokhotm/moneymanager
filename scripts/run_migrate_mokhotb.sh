#!/usr/bin/env bash
sudo docker run --rm --network moneymanager_default -e DATABASE_URL='postgresql://moneymanager:moneymanager_secure_pwd_2026@db:5432/money_manager?schema=public' -v /home/ubuntu/moneymanager:/app -w /app node:20 node scripts/set_mokhotb_user_role.js
