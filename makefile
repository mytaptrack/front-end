build-dev:
	export STAGE=development
	cd behavior && npm run build && cd ..
	cd manage && npm run build && cd ..

build-prod:
	export STAGE=prod
	cd behavior && npm run build && cd ..
	cd manage && npm run build && cd ..


dev-debug:
	docker run -p 8000:8000 -v ./nginx.conf:/etc/nginx/nginx.conf -v ./mime.types:/etc/nginx/mime.types -v ./behavior/dist/website/browser:/data/behavior -v ./manage/dist/website/browser:/data/manage nginx:latest

docker:
	docker build -t mtt-front-end:latest .

deploy-s3:
	cp ./behavior/src/environments/environment_s3_sample.ts ./behavior/src/environments/environment.ts
	cp ./behavior/src/environments/environment_s3_sample.ts ./behavior/src/environments/environment.prod.ts
	cp ./manage/src/environments/environment_s3_sample.ts ./manage/src/environments/environment.ts
	cp ./manage/src/environments/environment_s3_sample.ts ./manage/src/environments/environment.prod.ts

	cd utils && npm ci && npm run env-build

	cd behavior && npm ci && npm run build
	cd behavior/dist/website/browser && aws s3 sync . s3://${WEBSITE_BUCKET}/behavior
	
	cd manage && npm ci && npm run build
	cd manage/dist/website/browser && aws s3 sync . s3://${WEBSITE_BUCKET}/manage
