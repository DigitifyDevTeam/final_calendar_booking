"""
Configure PyMySQL to work with Django.
Django expects MySQLdb, but PyMySQL can be used as a drop-in replacement.
"""
import pymysql

# Configure PyMySQL to be used as MySQLdb
pymysql.install_as_MySQLdb()

