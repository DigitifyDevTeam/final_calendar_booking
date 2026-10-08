"""
Configure PyMySQL to work with Django.
Django expects MySQLdb, but PyMySQL can be used as a drop-in replacement.
"""
import pymysql

# Django 6 requires mysqlclient >= 2.2.1. PyMySQL installs as MySQLdb with
# a compatibility version_info of (1, 4, 6, ...), which fails that check.
pymysql.version_info = (2, 2, 1, "final", 0)
pymysql.install_as_MySQLdb()

