FROM node:8
WORKDIR /app/
COPY . .

RUN npm install
# If you are building your code for production
# RUN npm install --only=production

RUN rm -rf ./mirror*
RUN chmod +x wait-for-it.sh

CMD [ "npm", "start" ]
