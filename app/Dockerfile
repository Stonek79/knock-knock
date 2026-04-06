# Используем легкий Nginx для раздачи статики
FROM nginx:alpine

# Копируем конфиг Nginx для SPA (чтобы работал роутинг)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Копируем билд приложения
COPY dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
