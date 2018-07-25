import json, glob, os
from ftplib import FTP, error_perm

with open('package.json') as f:
	data = json.load(f)
version = data['version']

site = raw_input('Site: ')
username = raw_input('Username: ')
pwd = raw_input('Password: ' )

print 'Deploying version ' + version + ' to ' + site
ftp = FTP('ftp.' + site, username, pwd)
ftp.cwd('~/' + site + '/alpha/web_lic')
ftp.mkd(version)
ftp.mkd(version + '/static')
ftp.mkd(version + '/dist')
bundles = glob.glob('dist/[0-9]*.bundle.js');
bundles = [n.replace(os.path.sep, '/') for n in bundles]
for fn in ['whats_new.json', 'index.html', 'favicon.ico', 'static/style.css', 'dist/bundle.js'] + bundles:
	try:
		ftp.delete(fn)
	except error_perm:
		pass
	upfile = open(fn, 'r')
	ftp.storbinary('STOR ' + fn, upfile, blocksize=400000)
	upfile = open(fn, 'r')
	ftp.storbinary('STOR ' + version + '/' + fn, upfile, blocksize=400000)
	print ' - Uploaded ' + fn
ftp.quit()
print 'Success'
