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

