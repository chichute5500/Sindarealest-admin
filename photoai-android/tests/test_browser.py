"""Browser UI regression tests. These do NOT replace a real Android APK test."""
import unittest
from pathlib import Path
from playwright.sync_api import sync_playwright

ASSETS=Path(__file__).parents[1] / 'app/src/main/assets'

class PhotoAIWebUITest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.playwright=sync_playwright().start()
        cls.browser=cls.playwright.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
    @classmethod
    def tearDownClass(cls):
        cls.browser.close();cls.playwright.stop()
    def setUp(self):
        self.context=self.browser.new_context(viewport={'width':412,'height':915},device_scale_factor=2)
        self.page=self.context.new_page()
        self.errors=[]
        self.page.on('pageerror',lambda e:self.errors.append(str(e)))
        # Browser runner blocks file://, data: and localhost; inject local assets in about:blank.
        # CSP remains in production HTML; here we remove it solely to mount JS for unit testing.
        html=(ASSETS/'index.html').read_text()
        import re
        html=re.sub(r'<meta http-equiv="Content-Security-Policy"[^>]*>', '', html)
        html=html.replace('<script src="app.js"></script>','')
        self.page.set_content(html)
        self.page.evaluate("""()=>Object.defineProperty(window,'localStorage', {
            value:{getItem(k){return null},setItem(k,v){}}, configurable:true})""")
        self.page.add_style_tag(content=(ASSETS/'style.css').read_text())
        self.page.add_script_tag(content=(ASSETS/'app.js').read_text())
        self.page.evaluate('window.__PhotoTest.demo()')
        self.page.wait_for_function('window.__PhotoTest && window.__PhotoTest.state().photos.length===30')
    def tearDown(self):
        self.assertEqual(self.errors,[])
        self.context.close()
    def test_initial_layout_and_search(self):
        self.assertEqual(self.page.locator('#photoCount').inner_text(),'30')
        self.page.locator('#searchInput').fill('thắt lưng')
        self.assertTrue(int(self.page.locator('#gallery .photo').count())>0)
        self.assertTrue('KẾT QUẢ' in self.page.locator('#galleryTitle').inner_text())
    def test_multi_transfer_and_undo(self):
        before=self.page.evaluate('JSON.parse(JSON.stringify(window.__PhotoTest.state()))')
        a,b=before['photos'][:2]
        target=next(m for m in before['models'] if m['category']=='Thắt lưng')
        self.page.evaluate('(args)=>{window.__PhotoTest.movePhotos(args.ids,{type:"model",id:args.target})}',{'ids':[a['id'],b['id']],'target':target['id']})
        transferred=self.page.evaluate('window.__PhotoTest.state().photos')
        self.assertTrue(all(p['modelId']==target['id'] for p in transferred[:2]))
        self.page.evaluate('window.__PhotoTest.undo()')
        restored=self.page.evaluate('window.__PhotoTest.state().photos')
        self.assertEqual([p['modelId'] for p in before['photos'][:2]],[p['modelId'] for p in restored[:2]])
    def test_many_to_one_category(self):
        s=self.page.evaluate('JSON.parse(JSON.stringify(window.__PhotoTest.state()))')
        ids=[p['id'] for p in s['photos'][:4]]
        self.page.evaluate('(ids)=>window.__PhotoTest.movePhotos(ids,{type:"category",id:"Thắt lưng"})',ids)
        out=self.page.evaluate('window.__PhotoTest.state()')
        changed=[p for p in out['photos'] if p['id'] in ids]
        self.assertEqual(len(set(p['modelId'] for p in changed)),1)
    def test_confirmed_data_survives_ai_suggestions(self):
        s=self.page.evaluate('JSON.parse(JSON.stringify(window.__PhotoTest.state()))')
        keep=s['models'][0]
        self.page.evaluate('(id)=>{let m=window.__PhotoTest.state().models.find(x=>x.id===id);m.verified=true;m.priceVnd=3450000;m.name="Mẫu đã chốt"}',keep['id'])
        original=self.page.evaluate('(id)=>window.__PhotoTest.state().photos.filter(p=>p.modelId===id)',keep['id'])
        self.page.evaluate('''()=>{
          let s=window.__PhotoTest.state();let keep=s.models.find(m=>m.verified);
          let pending=s.photos.filter(p=>p.modelId!==keep.id);
          let cats=[...new Set(pending.map(p=>p.category))];
          let models=cats.map((cat,i)=>({id:'TEST_AI_'+i,category:cat,name:'Gợi ý '+cat}));
          let photos=pending.map(p=>({id:p.id,modelId:models.find(m=>m.category===p.category).id,color:'Chưa rõ',confidence:.3}));
          window.PhotoApp.onAnalysis({photos,models});
        }''')
        result=self.page.evaluate('window.__PhotoTest.state()')
        confirmed=next(m for m in result['models'] if m['id']==keep['id'])
        self.assertEqual(confirmed['name'],'Mẫu đã chốt')
        self.assertEqual(confirmed['priceVnd'],3450000)
        self.assertEqual(confirmed['verified'],True)
        self.assertEqual([p['id'] for p in original], [p['id'] for p in result['photos'] if p['modelId']==keep['id']])
    def test_invalid_ai_response_does_not_replace_data(self):
        before=self.page.evaluate('JSON.stringify(window.__PhotoTest.state())')
        self.page.evaluate('window.PhotoApp.onAnalysis({photos:[],models:[]})')
        after=self.page.evaluate('JSON.stringify(window.__PhotoTest.state())')
        self.assertEqual(before,after)
    def test_stale_ai_result_does_not_override_manual_transfer(self):
        self.page.evaluate('window.__PhotoTest.markAIStarted()')
        first=self.page.evaluate('window.__PhotoTest.state().photos[0]')
        target=self.page.evaluate('window.__PhotoTest.state().models.find(m=>m.category==="Thắt lưng")')
        self.page.evaluate('(arg)=>window.__PhotoTest.movePhotos([arg.id],{type:"model",id:arg.target})',{'id':first['id'],'target':target['id']})
        before=self.page.evaluate('JSON.stringify(window.__PhotoTest.state())')
        self.page.evaluate("""()=>{
          const s=window.__PhotoTest.state();
          const cats=[...new Set(s.photos.map(p=>p.category))];
          const models=cats.map((c,i)=>({id:'AI'+i,category:c,name:'AI mock'}));
          const photos=s.photos.map(p=>({id:p.id,modelId:models.find(m=>m.category===p.category).id,color:'Đen',confidence:.92}));
          window.PhotoApp.onAnalysis({photos,models});
        }""")
        self.assertEqual(before,self.page.evaluate('JSON.stringify(window.__PhotoTest.state())'))

    def test_changed_version_increments_on_manual_edit(self):
        start=self.page.evaluate('window.__PhotoTest.revision()')
        self.page.evaluate('window.__PhotoTest.movePhotos(["demo0"],{type:"category",id:"Giày tây"})')
        self.assertGreater(self.page.evaluate('window.__PhotoTest.revision()'),start)

    def test_manual_name_and_price_survive_ai_suggestions(self):
        keep=self.page.evaluate('window.__PhotoTest.state().models[0].id')
        self.page.evaluate("""id=>{let m=window.__PhotoTest.state().models.find(x=>x.id===id);m.verified=false;m.editedByUser=true;m.priceVnd=2790000;m.name="Ví đã chỉnh tay";}""",keep)
        self.page.evaluate("""()=>{
          let s=window.__PhotoTest.state();
          let pending=s.photos.filter(p=>!s.models.find(m=>m.id===p.modelId)?.editedByUser);
          let cats=[...new Set(pending.map(p=>p.category))];
          let models=cats.map((cat,i)=>({id:'REVIEW_AI_'+i,category:cat,name:'Gợi ý mới'}));
          let photos=pending.map(p=>({id:p.id,modelId:models.find(m=>m.category===p.category).id,color:'Chưa rõ',confidence:.34}));
          window.PhotoApp.onAnalysis({photos,models});
        }""")
        keep_after=self.page.evaluate('(id)=>window.__PhotoTest.state().models.find(m=>m.id===id)',keep)
        self.assertEqual(keep_after['name'],'Ví đã chỉnh tay')
        self.assertEqual(keep_after['priceVnd'],2790000)
        self.assertTrue(keep_after['editedByUser'])

    def test_search_result_can_be_moved_to_folder(self):
        all_before=self.page.evaluate('JSON.parse(JSON.stringify(window.__PhotoTest.state()))')
        original=all_before['photos'][0]
        target=next(m for m in all_before['models'] if m['category']=='Thắt lưng')
        self.page.locator('#searchInput').fill(original['name'])
        self.page.locator('#gallery .photo').first.click()
        self.page.locator('#moveBtn').click()
        self.page.wait_for_selector('input[name="destination"]')
        selected=self.page.evaluate("""(id)=>{
          const inputs=[...document.querySelectorAll('input[name="destination"]')];
          const input=inputs.find(x=>{let d=JSON.parse(decodeURIComponent(x.value));return d.type==='model' && d.id===id});
          if(!input)return false;input.checked=true;return true;
        }""",target['id'])
        self.assertTrue(selected)
        self.page.locator('#modalConfirm').click()
        photo=self.page.evaluate('(id)=>window.__PhotoTest.state().photos.find(p=>p.id===id)',original['id'])
        self.assertEqual(photo['modelId'],target['id'])
        self.assertEqual(photo['category'],'Thắt lưng')

    def test_real_edit_form_locks_product_name_and_price(self):
        model=self.page.evaluate('window.__PhotoTest.state().models[0]')
        self.page.evaluate('(id)=>window.__PhotoTest.setActive({type:"model",id})',model['id'])
        self.page.locator('#renameBtn').click()
        self.page.locator('#editName').fill('Ví cầm tay mẫu đã chốt tên')
        self.page.locator('#editPrice').fill('2450000')
        self.page.locator('#modalConfirm').click()
        updated=self.page.evaluate('(id)=>window.__PhotoTest.state().models.find(m=>m.id===id)',model['id'])
        self.assertEqual(updated['name'],'Ví cầm tay mẫu đã chốt tên')
        self.assertEqual(updated['priceVnd'],2450000)
        self.assertTrue(updated['editedByUser'])

    def test_long_press_touch_drag_to_visible_folder(self):
        before=self.page.evaluate('JSON.parse(JSON.stringify(window.__PhotoTest.state()))')
        photo=before['photos'][0]
        target=next(m['id'] for m in before['models'] if m['category']=='Thắt lưng')
        self.page.locator('#searchInput').fill(photo['name'])
        self.page.locator('#gallery .photo').first.scroll_into_view_if_needed()
        points=self.page.evaluate('''id=>{
           const source=document.querySelector('#gallery .photo');
           const target=[...document.querySelectorAll('.tree-row')].find(n=>n.__node.type==='model'&&n.__node.id===id);
           const point=e=>{const r=e.getBoundingClientRect();return {x:r.left+r.width/2,y:r.top+r.height/2}};
           return {start:point(source),end:point(target)};
        }''',target)
        self.page.evaluate('''({x,y})=>{
           const element=document.querySelector('#gallery .photo');
           const touch=new Touch({identifier:1,target:element,clientX:x,clientY:y});
           element.dispatchEvent(new TouchEvent('touchstart',{bubbles:true,cancelable:true,touches:[touch],targetTouches:[touch],changedTouches:[touch]}));
        }''',points['start'])
        self.page.wait_for_timeout(570)
        self.assertEqual(self.page.locator('.touch-drag-ghost').count(),1)
        self.page.evaluate('''({x,y})=>{
           const element=document.querySelector('#gallery .photo');
           const touch=new Touch({identifier:1,target:element,clientX:x,clientY:y});
           element.dispatchEvent(new TouchEvent('touchmove',{bubbles:true,cancelable:true,touches:[touch],targetTouches:[touch],changedTouches:[touch]}));
        }''',points['end'])
        self.page.evaluate('''({x,y})=>{
           const element=document.querySelector('#gallery .photo');
           const touch=new Touch({identifier:1,target:element,clientX:x,clientY:y});
           element.dispatchEvent(new TouchEvent('touchend',{bubbles:true,cancelable:true,touches:[],targetTouches:[],changedTouches:[touch]}));
        }''',points['end'])
        after=self.page.evaluate('(id)=>window.__PhotoTest.state().photos.find(p=>p.id===id)',photo['id'])
        self.assertEqual(after['modelId'],target)
        self.assertEqual(after['category'],'Thắt lưng')
        self.assertEqual(self.page.locator('.touch-drag-ghost').count(),0)

    def test_mobile_screenshot(self):
        self.page.screenshot(path='/mnt/data/PhotoAI_v0_5_Mobile_Preview.png',full_page=True)

if __name__=='__main__': unittest.main(verbosity=2)

 