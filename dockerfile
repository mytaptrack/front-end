FROM nginx

COPY nginx.conf /etc/nginx/nginx.conf
COPY behavior/dist/website/browser /data/behavior
COPY manage/dist/website/browser /data/manage

EXPOSE 8000
