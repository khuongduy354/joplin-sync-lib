start_joplin_server:  
	docker run --env-file .env -p 22300:22300 joplin/server:latest