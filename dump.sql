--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9 (84ade85)
-- Dumped by pg_dump version 16.9

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: candidates; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.candidates (
    id integer NOT NULL,
    candidate_name character varying(255) NOT NULL,
    email character varying(255) NOT NULL,
    job_id integer,
    candidate_skills text[],
    candidate_experience integer,
    match_percentage real,
    resume_url text,
    hr_handling_user_id character varying,
    status character varying(50) DEFAULT 'applied'::character varying,
    report_link text,
    interview_link text,
    created_at timestamp without time zone DEFAULT now(),
    technical_person_email character varying
);


ALTER TABLE public.candidates OWNER TO neondb_owner;

--
-- Name: candidates_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.candidates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.candidates_id_seq OWNER TO neondb_owner;

--
-- Name: candidates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.candidates_id_seq OWNED BY public.candidates.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    company_name character varying(255) NOT NULL,
    logo_url text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.companies OWNER TO neondb_owner;

--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.companies_id_seq OWNER TO neondb_owner;

--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: jobs; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.jobs (
    id integer NOT NULL,
    job_title character varying(255) NOT NULL,
    added_by_user_id character varying,
    hr_handling_user_id character varying,
    job_description text,
    skills text[],
    experience character varying(100),
    note text,
    positions_count integer DEFAULT 1,
    job_status character varying(50) DEFAULT 'active'::character varying,
    company_id integer,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.jobs OWNER TO neondb_owner;

--
-- Name: jobs_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.jobs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.jobs_id_seq OWNER TO neondb_owner;

--
-- Name: jobs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.jobs_id_seq OWNED BY public.jobs.id;


--
-- Name: notifications; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.notifications (
    id integer NOT NULL,
    user_id character varying,
    message text NOT NULL,
    "timestamp" timestamp without time zone DEFAULT now(),
    read_status boolean DEFAULT false
);


ALTER TABLE public.notifications OWNER TO neondb_owner;

--
-- Name: notifications_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.notifications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notifications_id_seq OWNER TO neondb_owner;

--
-- Name: notifications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.notifications_id_seq OWNED BY public.notifications.id;


--
-- Name: sessions; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.sessions (
    sid character varying NOT NULL,
    sess jsonb NOT NULL,
    expire timestamp without time zone NOT NULL
);


ALTER TABLE public.sessions OWNER TO neondb_owner;

--
-- Name: todos; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.todos (
    id integer NOT NULL,
    user_id character varying,
    task text NOT NULL,
    is_completed boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.todos OWNER TO neondb_owner;

--
-- Name: todos_id_seq; Type: SEQUENCE; Schema: public; Owner: neondb_owner
--

CREATE SEQUENCE public.todos_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.todos_id_seq OWNER TO neondb_owner;

--
-- Name: todos_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: neondb_owner
--

ALTER SEQUENCE public.todos_id_seq OWNED BY public.todos.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: neondb_owner
--

CREATE TABLE public.users (
    id character varying DEFAULT gen_random_uuid() NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    name character varying,
    password_hash character varying,
    role character varying(50) NOT NULL,
    company_id integer,
    account_status character varying(50) DEFAULT 'active'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.users OWNER TO neondb_owner;

--
-- Name: candidates id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.candidates ALTER COLUMN id SET DEFAULT nextval('public.candidates_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: jobs id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.jobs ALTER COLUMN id SET DEFAULT nextval('public.jobs_id_seq'::regclass);


--
-- Name: notifications id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications ALTER COLUMN id SET DEFAULT nextval('public.notifications_id_seq'::regclass);


--
-- Name: todos id; Type: DEFAULT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.todos ALTER COLUMN id SET DEFAULT nextval('public.todos_id_seq'::regclass);


--
-- Data for Name: candidates; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.candidates (id, candidate_name, email, job_id, candidate_skills, candidate_experience, match_percentage, resume_url, hr_handling_user_id, status, report_link, interview_link, created_at, technical_person_email) FROM stdin;
3	David Chen	david.chen@email.com	2	{"Product Management",Scrum,Analytics,Strategy}	\N	89.7	\N	hr-002	interview_scheduled	\N	\N	2025-08-04 22:09:41.856459	\N
6	Lisa Wang	lisa.wang@email.com	5	{Python,scikit-learn,SQL,R}	\N	82.6	\N	hr-003	hired	\N	\N	2025-08-04 22:09:41.856459	\N
7	Robert Johnson	robert.j@email.com	1	{JavaScript,Angular,Express.js}	\N	71.4	\N	hr-001	rejected	\N	\N	2025-08-04 22:09:41.856459	\N
9	Kevin Lee	kevin.lee@email.com	4	{Terraform,Jenkins,Linux,Monitoring}	\N	84.3	\N	hr-001	resume_reviewed	\N	\N	2025-08-04 22:09:41.856459	\N
10	Rachel Green	rachel.g@email.com	3	{"Adobe XD",InVision,Wireframing}	\N	76.8	\N	hr-003	interview_scheduled	\N	\N	2025-08-04 22:09:41.856459	\N
11	John Doe	john.doe@email.com	6	{Python,Pytest,"Selenium WebDriver","Robot Framework",Behave,Pytest-BDD,Jenkins,"GitLab CI",Git,Postman,"RESTful APIs",Jira,Bugzilla,Agile,Scrum,"Behavior-Driven Development (BDD)"}	\N	78	resume_temp_1754941728757_fulg8a185.txt	hr-001	resume_reviewed	\N	\N	2025-08-11 19:50:54.644763	\N
13	Jane Smith	jane.smith@email.com	6	{Python,JavaScript,"Selenium WebDriver",Playwright,"Robot Framework",Pytest,Pytest-BDD,"GitLab CI",Jenkins,Git,Postman,"RESTful APIs","requests library",Jira,TestRail,Zephyr}	5	73	resume_temp_1755291386244_zvid6anan.txt	hr-001	hired	\N	https://meet.google.com/x6kszunvs	2025-08-15 20:57:43.726211	
12	Jane Smith	jane.smith@email.com	6	{Python,JavaScript,"Selenium WebDriver",Playwright,"Robot Framework",Pytest,Pytest-BDD,"GitLab CI",Jenkins,Git,Postman,"RESTful APIs","requests library",Jira,TestRail,Zephyr,Agile,Scrum,BDD}	5	73	resume_temp_1754942549502_mpuohmdsd.txt	hr-001	interview_scheduled	\N	https://meet.google.com/f43b27hi0	2025-08-11 20:14:53.969765	
\.


--
-- Data for Name: companies; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.companies (id, company_name, logo_url, created_at) FROM stdin;
1	TechCorp Solutions	https://via.placeholder.com/100x100?text=TC	2025-08-04 22:09:21.718519
2	Digital Dynamics	https://via.placeholder.com/100x100?text=DD	2025-08-04 22:09:21.718519
3	Innovation Labs	https://via.placeholder.com/100x100?text=IL	2025-08-04 22:09:21.718519
\.


--
-- Data for Name: jobs; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.jobs (id, job_title, added_by_user_id, hr_handling_user_id, job_description, skills, experience, note, positions_count, job_status, company_id, created_at) FROM stdin;
1	Senior Software Engineer	company-admin-001	hr-001	We are looking for a senior software engineer with expertise in full-stack development.	{JavaScript,React,Node.js,PostgreSQL,AWS}	5+ years	\N	3	active	1	2025-08-04 22:09:34.920478
2	Product Manager	company-admin-001	hr-002	Seeking an experienced product manager to lead our product development initiatives.	{"Product Management",Agile,Analytics,Leadership}	4+ years	\N	2	active	1	2025-08-04 22:09:34.920478
3	UI/UX Designer	company-admin-002	hr-003	Creative UI/UX designer needed for designing intuitive user experiences.	{Figma,"Adobe Creative Suite",Prototyping,"User Research"}	3+ years	\N	1	active	2	2025-08-04 22:09:34.920478
5	Data Scientist	company-admin-002	hr-003	Data scientist to work on machine learning models and data analysis.	{Python,"Machine Learning",SQL,TensorFlow,Statistics}	3+ years	\N	1	active	2	2025-08-04 22:09:34.920478
6	Automation Tester	hr-001	\N	Designs, develops, and maintains automated test scripts and frameworks using Python to ensure the quality and reliability of software applications. This role is crucial for implementing efficient testing processes within a CI/CD pipeline.	{Python,Pytest,"Selenium WebDriver","Robot Framework",Git,Jenkins,"GitLab CI",Postman,"software testing methodologies","test case design","bug tracking"}	3		1	active	1	2025-08-04 22:30:29.2268
4	DevOps Engineer	company-admin-001	hr-001	DevOps engineer to manage our cloud infrastructure and deployment pipelines.	{Docker,Kubernetes,AWS,Jenkins}	4+ years		2	active	1	2025-08-04 22:09:34.920478
8	test	hr-001	\N	yrtgj jhol k	{ytrhfgy}	3		1	active	1	2025-08-15 21:57:52.029738
\.


--
-- Data for Name: notifications; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.notifications (id, user_id, message, "timestamp", read_status) FROM stdin;
1	hr-001	New candidate applied for Senior Software Engineer position	2025-08-04 20:09:48.324775	f
2	hr-001	Interview scheduled with James Thompson	2025-08-03 22:09:48.324775	t
3	hr-002	Product Manager job posting approved	2025-08-04 19:09:48.324775	f
4	hr-003	Emily Davis completed technical round	2025-08-04 21:39:48.324775	f
5	company-admin-001	Monthly hiring report is ready	2025-08-03 22:09:48.324775	t
6	company-admin-001	New job "test" has been posted by Alice	2025-08-15 21:57:52.094222	f
7	hr-001	New job "test" has been posted by Alice	2025-08-15 21:57:52.123898	f
8	hr-002	New job "test" has been posted by Alice	2025-08-15 21:57:52.149565	f
9	company-admin-001	Candidate Jane Smith has been scheduled for interview by Alice	2025-08-15 22:00:33.844595	f
10	hr-001	Candidate Jane Smith has been scheduled for interview by Alice	2025-08-15 22:00:33.878803	f
11	hr-002	Candidate Jane Smith has been scheduled for interview by Alice	2025-08-15 22:00:33.903173	f
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.sessions (sid, sess, expire) FROM stdin;
ak6zFCJPVwz-jPWpXchEL9pVIEMasSqa	{"user": {"id": "hr-001", "name": "Alice Johnson", "role": "HR", "email": "hr1@techcorp.com", "companyId": 1}, "cookie": {"path": "/", "secure": false, "expires": "2025-09-10T20:10:09.315Z", "httpOnly": true, "originalMaxAge": 604799999}}	2025-09-10 20:10:12
\.


--
-- Data for Name: todos; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.todos (id, user_id, task, is_completed, created_at) FROM stdin;
1	hr-001	Review Michael Rodriguez resume	f	2025-08-04 22:09:45.266759
2	hr-001	Schedule interview with Sarah Kim	f	2025-08-04 22:09:45.266759
3	hr-001	Follow up on DevOps candidates	t	2025-08-04 22:09:45.266759
4	hr-002	Conduct final interview for Product Manager role	f	2025-08-04 22:09:45.266759
5	hr-002	Update job posting requirements	f	2025-08-04 22:09:45.266759
6	hr-003	Review UI/UX portfolio submissions	f	2025-08-04 22:09:45.266759
7	hr-003	Prepare technical assessment for designers	t	2025-08-04 22:09:45.266759
8	company-admin-001	Review quarterly hiring metrics	f	2025-08-04 22:09:45.266759
9	company-admin-002	Approve new job postings	f	2025-08-04 22:09:45.266759
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: neondb_owner
--

COPY public.users (id, email, first_name, last_name, profile_image_url, name, password_hash, role, company_id, account_status, created_at, updated_at) FROM stdin;
45982331	chandanashree97@gmail.com	chandu	K	\N	chandu K	\N	HR	\N	active	2025-08-04 21:32:19.379896	2025-08-04 22:07:39.482
super-admin-001	admin@system.com	Super	Admin	\N	Super Admin	$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi	Super Admin	\N	active	2025-08-04 22:09:26.735379	2025-08-04 22:09:26.735379
company-admin-001	admin@techcorp.com	John	Doe	\N	John Doe	$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi	Company Admin	1	active	2025-08-04 22:09:26.735379	2025-08-04 22:09:26.735379
company-admin-002	admin@digitaldynamics.com	Jane	Smith	\N	Jane Smith	$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi	Company Admin	2	active	2025-08-04 22:09:26.735379	2025-08-04 22:09:26.735379
hr-001	hr1@techcorp.com	Alice	Johnson	\N	Alice Johnson	$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi	HR	1	active	2025-08-04 22:09:26.735379	2025-08-04 22:09:26.735379
hr-002	hr2@techcorp.com	Bob	Wilson	\N	Bob Wilson	$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi	HR	1	active	2025-08-04 22:09:26.735379	2025-08-04 22:09:26.735379
hr-003	hr1@digitaldynamics.com	Carol	Brown	\N	Carol Brown	$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi	HR	2	active	2025-08-04 22:09:26.735379	2025-08-04 22:09:26.735379
\.


--
-- Name: candidates_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.candidates_id_seq', 13, true);


--
-- Name: companies_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.companies_id_seq', 3, true);


--
-- Name: jobs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.jobs_id_seq', 8, true);


--
-- Name: notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.notifications_id_seq', 11, true);


--
-- Name: todos_id_seq; Type: SEQUENCE SET; Schema: public; Owner: neondb_owner
--

SELECT pg_catalog.setval('public.todos_id_seq', 9, true);


--
-- Name: candidates candidates_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_pkey PRIMARY KEY (id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: jobs jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_pkey PRIMARY KEY (id);


--
-- Name: notifications notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (sid);


--
-- Name: todos todos_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_pkey PRIMARY KEY (id);


--
-- Name: users users_email_unique; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_unique UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: IDX_session_expire; Type: INDEX; Schema: public; Owner: neondb_owner
--

CREATE INDEX "IDX_session_expire" ON public.sessions USING btree (expire);


--
-- Name: candidates candidates_hr_handling_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_hr_handling_user_id_users_id_fk FOREIGN KEY (hr_handling_user_id) REFERENCES public.users(id);


--
-- Name: candidates candidates_job_id_jobs_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.candidates
    ADD CONSTRAINT candidates_job_id_jobs_id_fk FOREIGN KEY (job_id) REFERENCES public.jobs(id);


--
-- Name: jobs jobs_added_by_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_added_by_user_id_users_id_fk FOREIGN KEY (added_by_user_id) REFERENCES public.users(id);


--
-- Name: jobs jobs_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: jobs jobs_hr_handling_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.jobs
    ADD CONSTRAINT jobs_hr_handling_user_id_users_id_fk FOREIGN KEY (hr_handling_user_id) REFERENCES public.users(id);


--
-- Name: notifications notifications_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.notifications
    ADD CONSTRAINT notifications_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: todos todos_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.todos
    ADD CONSTRAINT todos_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: users users_company_id_companies_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: neondb_owner
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_company_id_companies_id_fk FOREIGN KEY (company_id) REFERENCES public.companies(id);


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO neon_superuser WITH GRANT OPTION;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: cloud_admin
--

ALTER DEFAULT PRIVILEGES FOR ROLE cloud_admin IN SCHEMA public GRANT ALL ON TABLES TO neon_superuser WITH GRANT OPTION;


--
-- PostgreSQL database dump complete
--

