import urllib.request
import json

results = {}

# Get admin token via correct endpoint
try:
    data = json.dumps({'username': 'admin', 'password': 'Admin@123456'}).encode()
    req = urllib.request.Request(
        'http://localhost:8000/api/auth/admin-login/', 
        data=data, 
        headers={'Content-Type': 'application/json'}, 
        method='POST'
    )
    resp = urllib.request.urlopen(req, timeout=10)
    body = resp.read().decode()
    token_data = json.loads(body)
    access = token_data.get('access', '')
    results['admin_login'] = 'PASS' if access else 'FAIL'
    print('Admin login:', results['admin_login'])
except Exception as e:
    results['admin_login'] = f'FAIL: {e}'
    print('Admin login error:', e)
    access = ''

if access:
    headers = {'Authorization': f'Bearer {access}'}
    
    # Test hierarchy endpoint
    try:
        req2 = urllib.request.Request(
            'http://localhost:8000/api/admin/study-materials/hierarchy/', 
            headers=headers
        )
        resp2 = urllib.request.urlopen(req2, timeout=10)
        body2 = resp2.read().decode()
        hierarchy = json.loads(body2)
        print('\n=== HIERARCHY RESPONSE ===')
        for cat in hierarchy:
            cname = cat['name']
            print(f'Category: {cname} (id={cat["id"]})')
            for lvl in cat.get('levels', []):
                lname = lvl['name']
                print(f'  Level: {lname} (id={lvl["id"]})')
                for prep in lvl.get('preparations', []):
                    pname = prep['name']
                    cid = prep.get('courseId')
                    coming = prep.get('isComingSoon')
                    counts = prep.get('counts', {})
                    print(f'    Prep: {pname} (id={prep["id"]}, courseId={cid}, isComingSoon={coming})')
                    print(f'      Counts: syllabus={counts.get("syllabus",0)}, subj={counts.get("subjective_topicwise",0)}, obj={counts.get("objective_topicwise",0)}, rev={counts.get("revision_notes",0)}')
        results['hierarchy_api'] = 'PASS'
    except Exception as e:
        results['hierarchy_api'] = f'FAIL: {e}'
        print('Hierarchy error:', e)

    # Test study materials list
    try:
        req3 = urllib.request.Request(
            'http://localhost:8000/api/admin/study-materials/', 
            headers=headers
        )
        resp3 = urllib.request.urlopen(req3, timeout=10)
        body3 = resp3.read().decode()
        mats = json.loads(body3)
        total = mats.get('total', len(mats.get('materials', [])))
        print(f'\n=== STUDY MATERIALS: total={total} ===')
        for m in mats.get('materials', [])[:10]:
            print(f'  id={m["id"]}: {m["title"]} | cat={m["contentCategory"]} | type={m["noteType"]} | status={m["status"]}')
        results['study_materials_api'] = 'PASS'
    except Exception as e:
        results['study_materials_api'] = f'FAIL: {e}'
        print('Study materials error:', e)

    # Test academic tree
    try:
        req4 = urllib.request.Request(
            'http://localhost:8000/api/admin/study-materials/academic-tree/?exam_id=22', 
            headers=headers
        )
        resp4 = urllib.request.urlopen(req4, timeout=10)
        body4 = resp4.read().decode()
        tree = json.loads(body4)
        print(f'\n=== ACADEMIC TREE for exam_id=22 (5th Level Civil Engineering) ===')
        for subj in tree:
            print(f'  Subject: {subj["name"]} (id={subj["id"]})')
            for chap in subj.get('chapters', []):
                print(f'    Chapter: {chap["title"]} (id={chap["id"]})')
                for topic in chap.get('topics', []):
                    print(f'      Topic: {topic["name"]} (id={topic["id"]})')
        results['academic_tree_api'] = 'PASS'
    except Exception as e:
        results['academic_tree_api'] = f'FAIL: {e}'
        print('Academic tree error:', e)

    # Test packages endpoint
    try:
        req5 = urllib.request.Request(
            'http://localhost:8000/api/subscriptions/admin/plans/', 
            headers=headers
        )
        resp5 = urllib.request.urlopen(req5, timeout=10)
        body5 = resp5.read().decode()
        plans = json.loads(body5)
        print(f'\n=== SUBSCRIPTION PLANS ===')
        plans_list = plans if isinstance(plans, list) else plans.get('results', plans.get('plans', []))
        for p in plans_list[:5]:
            pname = p.get('name', 'N/A')
            ptype = p.get('package_type', 'N/A')
            print(f'  Plan: {pname} | type={ptype}')
        results['packages_api'] = 'PASS'
    except Exception as e:
        results['packages_api'] = f'FAIL: {e}'
        print('Packages error:', e)

    # Test student notes access
    try:
        req6 = urllib.request.Request(
            'http://localhost:8000/api/notes/materials/?content_category=syllabus', 
            headers=headers
        )
        resp6 = urllib.request.urlopen(req6, timeout=10)
        body6 = resp6.read().decode()
        notes = json.loads(body6)
        print(f'\n=== STUDENT NOTES (syllabus) ===')
        notes_list = notes if isinstance(notes, list) else notes.get('results', [])
        for n in notes_list[:5]:
            nid = n.get('id', 'N/A')
            ntitle = n.get('title', 'N/A')
            print(f'  Note: {nid}: {ntitle}')
        results['student_notes_api'] = 'PASS'
    except Exception as e:
        results['student_notes_api'] = f'FAIL: {e}'
        print('Student notes error:', e)

print('\n=== FINAL RESULTS ===')
for k, v in results.items():
    print(f'{k}: {v}')
