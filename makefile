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
	cd behavior && npm ci && npm run build
	cd behavior/dist/website && aws s3 sync . s3://${WEBSITE_BUCKET}/behavior
	
	cp manage/src/environments/environment_s3_example.ts ./manage/src/environments/environment.ts
	cd manage && npm ci && npm run build
	cd manage/dist/website && aws s3 sync . s3://${WEBSITE_BUCKET}/manage
