import urllib.request, json, time

data = json.dumps({'username': 'admin', 'password': 'Admin@123456'}).encode()
req = urllib.request.Request('http://localhost:8000/api/auth/admin-login/', data=data, headers={'Content-Type': 'application/json'}, method='POST')
resp = urllib.request.urlopen(req, timeout=10)
token_data = json.loads(resp.read().decode())
access = token_data.get('access', '')
print('Auth: PASS' if access else 'Auth: FAIL')

if access:
    start = time.time()
    req2 = urllib.request.Request('http://localhost:8000/api/admin/study-materials/hierarchy/', headers={'Authorization': 'Bearer ' + access})
    resp2 = urllib.request.urlopen(req2, timeout=30)
    body2 = resp2.read().decode()
    elapsed = time.time() - start
    hierarchy = json.loads(body2)
    print(f'Hierarchy API: PASS ({elapsed:.2f}s)')
    for cat in hierarchy:
        cname = cat['name']
        print(f'  Category: {cname}')
        for lvl in cat.get('levels', []):
            lname = lvl['name']
            preps = lvl.get('preparations', [])
            print(f'    Level: {lname} ({len(preps)} preps)')
            for prep in preps:
                pname = prep['name']
                coming = prep['isComingSoon']
                counts = prep['counts']
                print(f'      Prep: {pname} | coming_soon={coming} | syllabus={counts["syllabus"]} subj={counts["subjective_topicwise"]} obj={counts["objective_topicwise"]} rev={counts["revision_notes"]}')
